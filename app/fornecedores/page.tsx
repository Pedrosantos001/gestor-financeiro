"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fornecedor = {
  id: string;
  nome: string;
  telefone: string | null;
  observacao: string | null;
  ativo: boolean;
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  async function carregarFornecedores() {
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setFornecedores(data || []);
  }

  async function adicionarFornecedor(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Informe o nome do fornecedor.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.from("fornecedores").insert({
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      observacao: observacao.trim() || null,
    });

    setCarregando(false);

    if (error) {
      console.error(error);
      alert("Erro ao cadastrar fornecedor.");
      return;
    }

    setNome("");
    setTelefone("");
    setObservacao("");

    await carregarFornecedores();
  }

  async function alterarStatus(fornecedor: Fornecedor) {
    const { error } = await supabase
      .from("fornecedores")
      .update({
        ativo: !fornecedor.ativo,
      })
      .eq("id", fornecedor.id);

    if (error) {
      console.error(error);
      alert("Erro ao alterar fornecedor.");
      return;
    }

    await carregarFornecedores();
  }

  async function excluirFornecedor(fornecedor: Fornecedor) {
    const confirmar = confirm(
      `Deseja realmente excluir "${fornecedor.nome}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("fornecedores")
      .delete()
      .eq("id", fornecedor.id);

    if (error) {
      console.error(error);
      alert(
        "Não foi possível excluir. Esse fornecedor pode possuir dívidas cadastradas."
      );
      return;
    }

    await carregarFornecedores();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Fornecedores
          </h1>

          <p className="mt-1 text-slate-500">
            Cadastre e acompanhe os fornecedores da empresa.
          </p>
        </header>

        {/* FORMULÁRIO */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Novo fornecedor
          </h2>

          <form
            onSubmit={adicionarFornecedor}
            className="grid gap-4 md:grid-cols-3"
          >

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do fornecedor"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500"
            />

            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Telefone"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500"
            />

            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação"
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500"
            />

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 md:col-span-3"
            >
              {carregando ? "Salvando..." : "Adicionar fornecedor"}
            </button>

          </form>
        </section>

        {/* LISTA */}
        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-semibold">
              Fornecedores cadastrados
            </h2>
          </div>

          {fornecedores.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhum fornecedor cadastrado.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {fornecedores.map((fornecedor) => (

                <div
                  key={fornecedor.id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      {fornecedor.nome}
                    </h3>

                    {fornecedor.telefone && (
                      <p className="text-sm text-slate-500">
                        {fornecedor.telefone}
                      </p>
                    )}

                    {fornecedor.observacao && (
                      <p className="mt-1 text-sm text-slate-400">
                        {fornecedor.observacao}
                      </p>
                    )}

                  </div>

                  <div className="flex gap-3">

                    <button
                      onClick={() => alterarStatus(fornecedor)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${
                        fornecedor.ativo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {fornecedor.ativo ? "Ativo" : "Inativo"}
                    </button>

                    <button
                      onClick={() => excluirFornecedor(fornecedor)}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
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