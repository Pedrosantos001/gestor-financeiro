"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Parcela = {
  id: string;
  pedido_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  valor_pago: number;
  status: string;
  pedido?: {
    descricao: string;
    fornecedor?: {
      nome: string;
    };
  };
};

type Conta = {
  id: string;
  nome: string;
};

export default function PagamentosPage() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);

  const [parcelaId, setParcelaId] = useState("");
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: parcelasData, error: parcelasError } =
      await supabase
        .from("parcelas")
        .select(`
          id,
          pedido_id,
          numero,
          valor,
          vencimento,
          valor_pago,
          status,
          pedido:pedidos(
            descricao,
            fornecedor:fornecedores(nome)
          )
        `)
        .neq("status", "PAGA")
        .order("vencimento", {
          ascending: true,
        });

    if (parcelasError) {
      console.error(parcelasError);
    } else {
      setParcelas(
        (parcelasData as unknown as Parcela[]) || []
      );
    }

    const { data: contasData, error: contasError } =
      await supabase
        .from("contas")
        .select("id, nome")
        .eq("ativa", true)
        .in("tipo", [
          "PAGAMENTO",
          "RECEBIMENTO",
        ])
        .order("nome");

    if (contasError) {
      console.error(contasError);
    } else {
      setContas(contasData || []);
    }
  }

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function restante(parcela: Parcela) {
    return (
      Number(parcela.valor) -
      Number(parcela.valor_pago)
    );
  }

  async function registrarPagamento(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!parcelaId || !contaId) {
      alert(
        "Selecione a parcela e a conta."
      );
      return;
    }

    const parcela = parcelas.find(
      (item) => item.id === parcelaId
    );

    if (!parcela) {
      alert("Parcela não encontrada.");
      return;
    }

    const valorPagamento = Number(valor);

    if (!valorPagamento || valorPagamento <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const saldo = restante(parcela);

    if (valorPagamento > saldo) {
      alert(
        `O pagamento não pode ser maior que o saldo da parcela: ${moeda(
          saldo
        )}`
      );
      return;
    }

    setCarregando(true);

    /*
     * 1. Registra o pagamento
     */

    const { error: pagamentoError } =
      await supabase
        .from("pagamentos")
        .insert({
          parcela_id: parcela.id,
          conta_id: contaId,
          valor: valorPagamento,
          data,
        });

    if (pagamentoError) {
      console.error(pagamentoError);
      setCarregando(false);

      alert(
        "Erro ao registrar pagamento."
      );

      return;
    }

    /*
     * 2. Atualiza a parcela
     */

    const novoValorPago =
      Number(parcela.valor_pago) +
      valorPagamento;

    const novoStatus =
      novoValorPago >= Number(parcela.valor)
        ? "PAGA"
        : new Date(
            `${parcela.vencimento}T00:00:00`
          ) <
          new Date(
            new Date().setHours(
              0,
              0,
              0,
              0
            )
          )
        ? "ATRASADA"
        : "PENDENTE";

    const { error: parcelaError } =
      await supabase
        .from("parcelas")
        .update({
          valor_pago: novoValorPago,
          status: novoStatus,
        })
        .eq("id", parcela.id);

    if (parcelaError) {
      console.error(parcelaError);

      setCarregando(false);

      alert(
        "O pagamento foi registrado, mas houve erro ao atualizar a parcela."
      );

      return;
    }

    setCarregando(false);

    setParcelaId("");
    setContaId("");
    setValor("");

    await carregarDados();

    alert(
      "Pagamento registrado com sucesso!"
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Pagamentos
          </h1>

          <p className="mt-1 text-slate-500">
            Registre os pagamentos das parcelas.
          </p>
        </header>

        {/* REGISTRAR PAGAMENTO */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Registrar pagamento
          </h2>

          <form
            onSubmit={registrarPagamento}
            className="grid gap-4 md:grid-cols-2"
          >

            <select
              value={parcelaId}
              onChange={(e) =>
                setParcelaId(e.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >

              <option value="">
                Selecione a parcela
              </option>

              {parcelas.map((parcela) => {

                const pedido = Array.isArray(
                  parcela.pedido
                )
                  ? parcela.pedido[0]
                  : parcela.pedido;

                const fornecedor =
                  Array.isArray(
                    pedido?.fornecedor
                  )
                    ? pedido?.fornecedor[0]
                    : pedido?.fornecedor;

                return (
                  <option
                    key={parcela.id}
                    value={parcela.id}
                  >
                    {fornecedor?.nome ||
                      "Fornecedor"}{" "}
                    — Parcela{" "}
                    {parcela.numero} —{" "}
                    {moeda(
                      restante(parcela)
                    )}
                  </option>
                );
              })}

            </select>

            <select
              value={contaId}
              onChange={(e) =>
                setContaId(e.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >

              <option value="">
                Conta utilizada
              </option>

              {contas.map((conta) => (
                <option
                  key={conta.id}
                  value={conta.id}
                >
                  {conta.nome}
                </option>
              ))}

            </select>

            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) =>
                setValor(e.target.value)
              }
              placeholder="Valor pago"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              type="date"
              value={data}
              onChange={(e) =>
                setData(e.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 md:col-span-2"
            >
              {carregando
                ? "Registrando..."
                : "Registrar pagamento"}
            </button>

          </form>

        </section>

        {/* PARCELAS */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <h2 className="text-xl font-semibold">
              Parcelas em aberto
            </h2>

          </div>

          {parcelas.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhuma parcela em aberto.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {parcelas.map((parcela) => {

                const pedido = Array.isArray(
                  parcela.pedido
                )
                  ? parcela.pedido[0]
                  : parcela.pedido;

                const fornecedor =
                  Array.isArray(
                    pedido?.fornecedor
                  )
                    ? pedido?.fornecedor[0]
                    : pedido?.fornecedor;

                return (

                  <div
                    key={parcela.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                      <div>

                        <h3 className="font-semibold text-slate-900">
                          {fornecedor?.nome ||
                            "Fornecedor"}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {pedido?.descricao ||
                            "Pedido"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Parcela{" "}
                          {parcela.numero} ·
                          Vencimento{" "}
                          {new Date(
                            `${parcela.vencimento}T00:00:00`
                          ).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-xs text-slate-400">
                          Saldo da parcela
                        </p>

                        <p className="text-xl font-bold text-red-600">
                          {moeda(
                            restante(parcela)
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

      </div>
    </main>
  );
}