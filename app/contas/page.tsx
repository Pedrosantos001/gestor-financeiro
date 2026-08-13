"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Conta = {
  id: string;
  nome: string;
  instituicao: string | null;
  tipo: "RECEBIMENTO" | "PAGAMENTO" | "RESERVA";
  ativa: boolean;
};

const tipos = [
  { value: "RECEBIMENTO", label: "Recebimento" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "RESERVA", label: "Reserva" },
];

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [nome, setNome] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [tipo, setTipo] = useState<Conta["tipo"]>("RECEBIMENTO");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarContas();
  }, []);

  async function carregarContas() {
    const { data, error } = await supabase
      .from("contas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setContas(data || []);
  }

  async function adicionarConta(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Informe o nome da conta.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.from("contas").insert({
      nome: nome.trim(),
      instituicao: instituicao.trim() || null,
      tipo,
    });

    setCarregando(false);

    if (error) {
      alert("Erro ao adicionar conta.");
      console.error(error);
      return;
    }

    setNome("");
    setInstituicao("");
    setTipo("RECEBIMENTO");

    await carregarContas();
  }

  async function alterarStatus(conta: Conta) {
    const { error } = await supabase
      .from("contas")
      .update({
        ativa: !conta.ativa,
      })
      .eq("id", conta.id);

    if (error) {
      alert("Erro ao alterar conta.");
      console.error(error);
      return;
    }

    await carregarContas();
  }

  async function excluirConta(conta: Conta) {
    const confirmar = confirm(
      `Deseja realmente excluir a conta "${conta.nome}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("contas")
      .delete()
      .eq("id", conta.id);

    if (error) {
      alert(
        "Não foi possível excluir esta conta. Ela pode estar relacionada a outros lançamentos."
      );
      console.error(error);
      return;
    }

    await carregarContas();
  }

  function nomeTipo(tipo: Conta["tipo"]) {
    return tipos.find((item) => item.value === tipo)?.label || tipo;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Contas
          </h1>

          <p className="mt-1 text-slate-500">
            Gerencie as contas utilizadas pela empresa.
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            Adicionar conta
          </h2>

          <form
            onSubmit={adicionarConta}
            className="grid gap-4 md:grid-cols-4"
          >
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da conta"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500"
            />

            <input
              value={instituicao}
              onChange={(e) => setInstituicao(e.target.value)}
              placeholder="Instituição"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500"
            />

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as Conta["tipo"])
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              {tipos.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {carregando ? "Salvando..." : "Adicionar"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-semibold">
              Contas cadastradas
            </h2>
          </div>

          {contas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma conta cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {conta.nome}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {conta.instituicao || "Instituição não informada"}
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      {nomeTipo(conta.tipo)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => alterarStatus(conta)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        conta.ativa
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {conta.ativa ? "Ativa" : "Inativa"}
                    </button>

                    <button
                      onClick={() => excluirConta(conta)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
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