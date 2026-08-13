"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fornecedor = {
  id: string;
  nome: string;
};

type Divida = {
  id: string;
  fornecedor_id: string;
  descricao: string | null;
  valor_total: number;
  valor_pago: number;
  data_compra: string;
  vencimento: string;
  status: "PENDENTE" | "PAGA" | "ATRASADA";
  fornecedor?: {
    nome: string;
  };
};

export default function DividasPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);

  const [fornecedorId, setFornecedorId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorPago, setValorPago] = useState("0");
  const [dataCompra, setDataCompra] = useState("");
  const [vencimento, setVencimento] = useState("");

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarFornecedores();
    carregarDividas();
  }, []);

  async function carregarFornecedores() {
    const { data, error } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error(error);
      return;
    }

    setFornecedores(data || []);
  }

  async function carregarDividas() {
    const { data, error } = await supabase
      .from("dividas")
      .select(`
        id,
        fornecedor_id,
        descricao,
        valor_total,
        valor_pago,
        data_compra,
        vencimento,
        status,
        fornecedor:fornecedores(nome)
      `)
      .order("vencimento", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setDividas((data as unknown as Divida[]) || []);
  }

  function atualizarStatus(
    total: number,
    pago: number,
    vencimento: string
  ): "PENDENTE" | "PAGA" | "ATRASADA" {
    if (pago >= total) {
      return "PAGA";
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVencimento = new Date(`${vencimento}T00:00:00`);

    if (dataVencimento < hoje) {
      return "ATRASADA";
    }

    return "PENDENTE";
  }

  async function adicionarDivida(event: FormEvent) {
    event.preventDefault();

    if (!fornecedorId) {
      alert("Selecione um fornecedor.");
      return;
    }

    if (!valorTotal || Number(valorTotal) <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!dataCompra || !vencimento) {
      alert("Informe as datas.");
      return;
    }

    const total = Number(valorTotal);
    const pago = Number(valorPago || 0);

    if (pago > total) {
      alert("O valor pago não pode ser maior que o valor total.");
      return;
    }

    setCarregando(true);

    const status = atualizarStatus(
      total,
      pago,
      vencimento
    );

    const { error } = await supabase.from("dividas").insert({
      fornecedor_id: fornecedorId,
      descricao: descricao.trim() || null,
      valor_total: total,
      valor_pago: pago,
      data_compra: dataCompra,
      vencimento,
      status,
    });

    setCarregando(false);

    if (error) {
      console.error(error);
      alert("Erro ao cadastrar dívida.");
      return;
    }

    setFornecedorId("");
    setDescricao("");
    setValorTotal("");
    setValorPago("0");
    setDataCompra("");
    setVencimento("");

    await carregarDividas();
  }

  async function excluirDivida(divida: Divida) {
    const confirmar = confirm(
      "Deseja realmente excluir esta dívida?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("dividas")
      .delete()
      .eq("id", divida.id);

    if (error) {
      console.error(error);
      alert(
        "Não foi possível excluir esta dívida."
      );
      return;
    }

    await carregarDividas();
  }

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function statusVisual(status: Divida["status"]) {
    if (status === "PAGA") {
      return {
        texto: "Paga",
        classe: "bg-green-100 text-green-700",
      };
    }

    if (status === "ATRASADA") {
      return {
        texto: "Atrasada",
        classe: "bg-red-100 text-red-700",
      };
    }

    return {
      texto: "Pendente",
      classe: "bg-yellow-100 text-yellow-700",
    };
  }

  function diasParaVencimento(data: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vencimento = new Date(`${data}T00:00:00`);

    const diferenca =
      vencimento.getTime() - hoje.getTime();

    return Math.ceil(
      diferenca / (1000 * 60 * 60 * 24)
    );
  }

  function prioridade(divida: Divida) {
    const dias = diasParaVencimento(
      divida.vencimento
    );

    if (divida.status === "ATRASADA") {
      return "1";
    }

    if (dias <= 0) {
      return "2";
    }

    if (dias <= 7) {
      return "3";
    }

    return "4";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Dívidas
          </h1>

          <p className="mt-1 text-slate-500">
            Controle de fornecedores e compromissos financeiros.
          </p>
        </header>

        {/* CADASTRO */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Nova dívida
          </h2>

          <form
            onSubmit={adicionarDivida}
            className="grid gap-4 md:grid-cols-2"
          >

            <select
              value={fornecedorId}
              onChange={(e) =>
                setFornecedorId(e.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="">
                Selecione o fornecedor
              </option>

              {fornecedores.map((fornecedor) => (
                <option
                  key={fornecedor.id}
                  value={fornecedor.id}
                >
                  {fornecedor.nome}
                </option>
              ))}
            </select>

            <input
              value={descricao}
              onChange={(e) =>
                setDescricao(e.target.value)
              }
              placeholder="Descrição da compra"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={(e) =>
                setValorTotal(e.target.value)
              }
              placeholder="Valor total"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPago}
              onChange={(e) =>
                setValorPago(e.target.value)
              }
              placeholder="Valor já pago"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <div>
              <label className="mb-2 block text-sm text-slate-500">
                Data da compra
              </label>

              <input
                type="date"
                value={dataCompra}
                onChange={(e) =>
                  setDataCompra(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-500">
                Vencimento
              </label>

              <input
                type="date"
                value={vencimento}
                onChange={(e) =>
                  setVencimento(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 md:col-span-2"
            >
              {carregando
                ? "Salvando..."
                : "Cadastrar dívida"}
            </button>

          </form>
        </section>

        {/* LISTA */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-semibold">
              Dívidas cadastradas
            </h2>
          </div>

          {dividas.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhuma dívida cadastrada.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {dividas.map((divida) => {

                const status = statusVisual(
                  divida.status
                );

                const restante =
                  Number(divida.valor_total) -
                  Number(divida.valor_pago);

                return (

                  <div
                    key={divida.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                      <div>

                        <h3 className="font-semibold text-slate-900">
                          {divida.fornecedor?.nome ||
                            "Fornecedor"}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {divida.descricao ||
                            "Compra"}
                        </p>

                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}
                      >
                        {status.texto}
                      </span>

                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-5">

                      <div>
                        <p className="text-xs text-slate-400">
                          Valor total
                        </p>

                        <p className="font-semibold">
                          {moeda(
                            Number(
                              divida.valor_total
                            )
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Já pago
                        </p>

                        <p className="font-semibold">
                          {moeda(
                            Number(
                              divida.valor_pago
                            )
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Falta pagar
                        </p>

                        <p className="font-semibold text-red-600">
                          {moeda(restante)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Vencimento
                        </p>

                        <p className="font-semibold">
                          {new Date(
                            `${divida.vencimento}T00:00:00`
                          ).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Prioridade
                        </p>

                        <p className="font-semibold">
                          {prioridade(divida)}
                        </p>
                      </div>

                    </div>

                    <div className="mt-5 flex justify-end">

                      <button
                        onClick={() =>
                          excluirDivida(divida)
                        }
                        className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Excluir
                      </button>

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