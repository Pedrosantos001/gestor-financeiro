"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Conta = {
  id: string;
  nome: string;
};

type Entrada = {
  id: string;
  conta_id: string;
  valor: number;
  data: string;
  observacao: string | null;
};

export default function EntradasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);

  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observacao, setObservacao] = useState("");

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    await carregarContas();
    await carregarEntradas();
  }

  async function carregarContas() {
    const { data, error } = await supabase
      .from("contas")
      .select("id, nome")
      .eq("ativa", true)
      .eq("tipo", "RECEBIMENTO")
      .order("nome");

    if (error) {
      console.error("Erro ao carregar contas:", error);
      return;
    }

    setContas(data || []);
  }

  async function carregarEntradas() {
    const { data, error } = await supabase
      .from("entradas")
      .select(`
        id,
        conta_id,
        valor,
        data,
        observacao
      `)
      .order("data", {
        ascending: false,
      });

    if (error) {
      console.error("Erro ao carregar entradas:", error);
      return;
    }

    setEntradas(data || []);
  }

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function nomeConta(contaId: string) {
    const conta = contas.find(
      (item) => item.id === contaId
    );

    return conta?.nome || "Conta";
  }

  async function adicionarEntrada(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!contaId) {
      alert("Selecione a conta.");
      return;
    }

    const valorNumerico = Number(valor);

    if (
      !valorNumerico ||
      valorNumerico <= 0
    ) {
      alert("Informe um valor válido.");
      return;
    }

    if (!data) {
      alert("Informe a data.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase
      .from("entradas")
      .insert({
        conta_id: contaId,
        valor: valorNumerico,
        data,
        observacao:
          observacao.trim() || null,
      });

    if (error) {
      console.error("Erro ao cadastrar entrada:", error);
      setCarregando(false);

      alert("Erro ao registrar entrada.");
      return;
    }

    setContaId("");
    setValor("");
    setObservacao("");

    await carregarEntradas();

    setCarregando(false);

    alert("Entrada registrada com sucesso!");
  }

  async function excluirEntrada(id: string) {
    const confirmar = window.confirm(
      "Excluir esta entrada?"
    );

    if (!confirmar) {
      return;
    }

    const { error } = await supabase
      .from("entradas")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir entrada:", error);
      alert("Erro ao excluir entrada.");
      return;
    }

    await carregarEntradas();
  }

  const totalEntradas = entradas.reduce(
    (total, entrada) =>
      total + Number(entrada.valor),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">

        {/* CABEÇALHO */}

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Entradas
          </h1>

          <p className="mt-1 text-slate-500">
            Registre cada recebimento por conta e
            data.
          </p>
        </header>

        {/* CADASTRO */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Nova entrada
          </h2>

          <form
            onSubmit={adicionarEntrada}
            className="grid gap-4 md:grid-cols-2"
          >

            <select
              value={contaId}
              onChange={(e) =>
                setContaId(e.target.value)
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="">
                Selecione a conta
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
              placeholder="Valor recebido"
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

            <input
              value={observacao}
              onChange={(e) =>
                setObservacao(e.target.value)
              }
              placeholder="Observação (opcional)"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-50 md:col-span-2"
            >
              {carregando
                ? "Registrando..."
                : "Registrar entrada"}
            </button>

          </form>

        </section>

        {/* TOTAL */}

        <section className="mb-6 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">

          <p className="text-sm text-slate-300">
            Total de entradas registradas
          </p>

          <p className="mt-2 text-3xl font-bold">
            {moeda(totalEntradas)}
          </p>

        </section>

        {/* HISTÓRICO */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <h2 className="text-xl font-semibold">
              Histórico de entradas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cada recebimento fica registrado
              individualmente.
            </p>

          </div>

          {entradas.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhuma entrada registrada.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {entradas.map((entrada) => (

                <div
                  key={entrada.id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >

                  <div>

                    <p className="text-sm text-slate-400">
                      {new Date(
                        `${entrada.data}T00:00:00`
                      ).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>

                    <h3 className="font-semibold text-slate-900">
                      {nomeConta(
                        entrada.conta_id
                      )}
                    </h3>

                    {entrada.observacao && (
                      <p className="mt-1 text-sm text-slate-500">
                        {entrada.observacao}
                      </p>
                    )}

                  </div>

                  <div className="flex items-center gap-4">

                    <strong className="text-xl text-green-600">
                      {moeda(
                        Number(
                          entrada.valor
                        )
                      )}
                    </strong>

                    <button
                      onClick={() =>
                        excluirEntrada(
                          entrada.id
                        )
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                    >
                      Excluir
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>
    </main>
  );
}