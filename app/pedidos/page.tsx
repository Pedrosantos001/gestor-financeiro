"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fornecedor = {
  id: string;
  nome: string;
};

type Parcela = {
  id: string;
  numero: number;
  valor: number;
  vencimento: string;
  valor_pago: number;
  status: string;
};

type Pedido = {
  id: string;
  fornecedor_id: string;
  descricao: string;
  data_pedido: string;
  valor_total: number;
  forma_pagamento: string;
  quantidade_parcelas: number | null;
  observacao: string | null;
  fornecedor?: {
    nome: string;
  };
  parcelas?: Parcela[];
};

export default function PedidosPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const [fornecedorId, setFornecedorId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataPedido, setDataPedido] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [valorTotal, setValorTotal] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<
    "A_VISTA" | "A_PRAZO" | "PARCELADO"
  >("A_VISTA");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("2");
  const [observacao, setObservacao] = useState("");

  const [parcelas, setParcelas] = useState<
    {
      numero: number;
      valor: string;
      vencimento: string;
    }[]
  >([]);

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: fornecedoresData } =
      await supabase
        .from("fornecedores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

    if (fornecedoresData) {
      setFornecedores(fornecedoresData);
    }

    await carregarPedidos();
  }

  async function carregarPedidos() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        fornecedor_id,
        descricao,
        data_pedido,
        valor_total,
        forma_pagamento,
        quantidade_parcelas,
        observacao,
        fornecedor:fornecedores(nome),
        parcelas(
          id,
          numero,
          valor,
          vencimento,
          valor_pago,
          status
        )
      `)
      .order("data_pedido", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setPedidos(
      (data as unknown as Pedido[]) || []
    );
  }

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function adicionarMeses(
    data: Date,
    meses: number
  ) {
    const nova = new Date(data);
    nova.setMonth(nova.getMonth() + meses);

    return nova.toISOString().split("T")[0];
  }

  function gerarParcelas() {
    const total = Number(valorTotal);
    const quantidade = Number(
      quantidadeParcelas
    );

    if (!total || total <= 0) {
      alert("Informe o valor total.");
      return;
    }

    if (!quantidade || quantidade < 2) {
      alert("Informe pelo menos 2 parcelas.");
      return;
    }

    const valorBase =
      Math.floor(
        (total / quantidade) * 100
      ) / 100;

    let acumulado = 0;

    const novaLista = [];

    for (let i = 1; i <= quantidade; i++) {
      let valor = valorBase;

      if (i === quantidade) {
        valor =
          Math.round(
            (total - acumulado) * 100
          ) / 100;
      }

      acumulado += valor;

      novaLista.push({
        numero: i,
        valor: valor.toFixed(2),
        vencimento: adicionarMeses(
          new Date(`${dataPedido}T00:00:00`),
          i
        ),
      });
    }

    setParcelas(novaLista);
  }

  function alterarParcela(
    numero: number,
    campo: "valor" | "vencimento",
    valor: string
  ) {
    setParcelas((anterior) =>
      anterior.map((parcela) =>
        parcela.numero === numero
          ? {
              ...parcela,
              [campo]: valor,
            }
          : parcela
      )
    );
  }

  const totalParcelas = parcelas.reduce(
    (total, parcela) =>
      total + Number(parcela.valor || 0),
    0
  );

  const diferenca =
    Math.round(
      (Number(valorTotal || 0) -
        totalParcelas) *
        100
    ) / 100;

  async function salvarPedido(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!fornecedorId) {
      alert("Selecione um fornecedor.");
      return;
    }

    if (!descricao.trim()) {
      alert("Informe a descrição do pedido.");
      return;
    }

    const total = Number(valorTotal);

    if (!total || total <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    let parcelasFinais: {
      numero: number;
      valor: number;
      vencimento: string;
    }[] = [];

    if (formaPagamento === "A_VISTA") {
      parcelasFinais = [
        {
          numero: 1,
          valor: total,
          vencimento: dataPedido,
        },
      ];
    }

    if (formaPagamento === "A_PRAZO") {
      parcelasFinais = [
        {
          numero: 1,
          valor: total,
          vencimento: adicionarMeses(
            new Date(`${dataPedido}T00:00:00`),
            1
          ),
        },
      ];
    }

    if (formaPagamento === "PARCELADO") {
      if (parcelas.length === 0) {
        alert("Gere as parcelas primeiro.");
        return;
      }

      if (Math.abs(diferenca) > 0.01) {
        alert(
          `A soma das parcelas precisa ser ${moeda(
            total
          )}.`
        );
        return;
      }

      parcelasFinais = parcelas.map(
        (parcela) => ({
          numero: parcela.numero,
          valor: Number(parcela.valor),
          vencimento: parcela.vencimento,
        })
      );
    }

    setCarregando(true);

    const { data: pedido, error } =
      await supabase
        .from("pedidos")
        .insert({
          fornecedor_id: fornecedorId,
          descricao: descricao.trim(),
          data_pedido: dataPedido,
          valor_total: total,
          forma_pagamento: formaPagamento,
          quantidade_parcelas:
            parcelasFinais.length,
          observacao:
            observacao.trim() || null,
        })
        .select("id")
        .single();

    if (error || !pedido) {
      console.error(error);
      setCarregando(false);
      alert("Erro ao salvar pedido.");
      return;
    }

    const { error: parcelaError } =
      await supabase.from("parcelas").insert(
        parcelasFinais.map((parcela) => ({
          pedido_id: pedido.id,
          numero: parcela.numero,
          valor: parcela.valor,
          vencimento: parcela.vencimento,
          valor_pago: 0,
          status: "PENDENTE",
        }))
      );

    if (parcelaError) {
      console.error(parcelaError);

      await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id);

      setCarregando(false);
      alert("Erro ao salvar parcelas.");
      return;
    }

    setFornecedorId("");
    setDescricao("");
    setValorTotal("");
    setFormaPagamento("A_VISTA");
    setQuantidadeParcelas("2");
    setObservacao("");
    setParcelas([]);

    await carregarPedidos();

    setCarregando(false);

    alert("Pedido cadastrado com sucesso!");
  }

  async function excluirPedido(id: string) {
    const confirmar = confirm(
      "Excluir este pedido e todas as suas parcelas?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(
        "Não foi possível excluir o pedido."
      );
      return;
    }

    await carregarPedidos();
  }

  function statusParcela(
    parcela: Parcela
  ) {
    if (parcela.status === "PAGA") {
      return "bg-green-100 text-green-700";
    }

    if (parcela.status === "ATRASADA") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  function textoStatus(status: string) {
    if (status === "PAGA") return "Paga";
    if (status === "ATRASADA")
      return "Atrasada";

    return "Pendente";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Pedidos
          </h1>

          <p className="mt-1 text-slate-500">
            Compras, parcelas e histórico financeiro.
          </p>
        </header>

        {/* CADASTRO */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Novo pedido
          </h2>

          <form
            onSubmit={salvarPedido}
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

              {fornecedores.map(
                (fornecedor) => (
                  <option
                    key={fornecedor.id}
                    value={fornecedor.id}
                  >
                    {fornecedor.nome}
                  </option>
                )
              )}
            </select>

            <input
              value={descricao}
              onChange={(e) =>
                setDescricao(e.target.value)
              }
              placeholder="Descrição do pedido"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              type="date"
              value={dataPedido}
              onChange={(e) =>
                setDataPedido(e.target.value)
              }
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

            <select
              value={formaPagamento}
              onChange={(e) => {
                const valor =
                  e.target.value as
                    | "A_VISTA"
                    | "A_PRAZO"
                    | "PARCELADO";

                setFormaPagamento(valor);

                if (
                  valor !== "PARCELADO"
                ) {
                  setParcelas([]);
                }
              }}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="A_VISTA">
                À vista
              </option>

              <option value="A_PRAZO">
                A prazo
              </option>

              <option value="PARCELADO">
                Parcelado
              </option>
            </select>

            {formaPagamento ===
              "PARCELADO" && (
              <input
                type="number"
                min="2"
                value={quantidadeParcelas}
                onChange={(e) =>
                  setQuantidadeParcelas(
                    e.target.value
                  )
                }
                placeholder="Quantidade de parcelas"
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
            )}

            <input
              value={observacao}
              onChange={(e) =>
                setObservacao(e.target.value)
              }
              placeholder="Observação"
              className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2"
            />

            {formaPagamento ===
              "PARCELADO" && (
              <div className="md:col-span-2">

                <button
                  type="button"
                  onClick={gerarParcelas}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
                >
                  Gerar parcelas
                </button>

                {parcelas.length > 0 && (
                  <div className="mt-4 space-y-3">

                    {parcelas.map(
                      (parcela) => (
                        <div
                          key={parcela.numero}
                          className="grid gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-3"
                        >
                          <strong>
                            Parcela{" "}
                            {parcela.numero}
                          </strong>

                          <input
                            type="number"
                            step="0.01"
                            value={
                              parcela.valor
                            }
                            onChange={(e) =>
                              alterarParcela(
                                parcela.numero,
                                "valor",
                                e.target.value
                              )
                            }
                            className="rounded-xl border border-slate-200 px-4 py-2"
                          />

                          <input
                            type="date"
                            value={
                              parcela.vencimento
                            }
                            onChange={(e) =>
                              alterarParcela(
                                parcela.numero,
                                "vencimento",
                                e.target.value
                              )
                            }
                            className="rounded-xl border border-slate-200 px-4 py-2"
                          />
                        </div>
                      )
                    )}

                    <div
                      className={`rounded-xl p-4 ${
                        Math.abs(
                          diferenca
                        ) <= 0.01
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      Total das parcelas:{" "}
                      <strong>
                        {moeda(
                          totalParcelas
                        )}
                      </strong>
                    </div>

                  </div>
                )}

              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-50 md:col-span-2"
            >
              {carregando
                ? "Salvando..."
                : "Salvar pedido"}
            </button>

          </form>

        </section>

        {/* HISTÓRICO */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-semibold">
              Histórico de pedidos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cada compra permanece registrada
              individualmente.
            </p>
          </div>

          {pedidos.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhum pedido cadastrado.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {pedidos.map((pedido) => {

                const parcelasPedido =
                  pedido.parcelas || [];

                const totalPago =
                  parcelasPedido.reduce(
                    (total, parcela) =>
                      total +
                      Number(
                        parcela.valor_pago
                      ),
                    0
                  );

                const saldo =
                  Number(
                    pedido.valor_total
                  ) - totalPago;

                const fornecedor =
                  Array.isArray(
                    pedido.fornecedor
                  )
                    ? pedido.fornecedor[0]
                    : pedido.fornecedor;

                return (

                  <div
                    key={pedido.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                      <div>

                        <p className="text-sm text-slate-400">
                          {new Date(
                            `${pedido.data_pedido}T00:00:00`
                          ).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          {fornecedor?.nome ||
                            "Fornecedor"}
                        </h3>

                        <p className="mt-1 text-slate-600">
                          {pedido.descricao}
                        </p>

                        {pedido.observacao && (
                          <p className="mt-1 text-sm text-slate-400">
                            {pedido.observacao}
                          </p>
                        )}

                      </div>

                      <div className="text-left md:text-right">

                        <p className="text-sm text-slate-400">
                          Valor do pedido
                        </p>

                        <p className="text-xl font-bold">
                          {moeda(
                            Number(
                              pedido.valor_total
                            )
                          )}
                        </p>

                        <p className="mt-1 text-sm text-green-600">
                          Pago:{" "}
                          {moeda(totalPago)}
                        </p>

                        <p className="text-sm text-red-600">
                          Em aberto:{" "}
                          {moeda(saldo)}
                        </p>

                      </div>

                    </div>

                    {/* PARCELAS */}

                    <div className="mt-6 overflow-x-auto">

                      <table className="w-full text-sm">

                        <thead>
                          <tr className="border-b border-slate-100 text-left text-slate-400">
                            <th className="pb-3">
                              Parcela
                            </th>

                            <th className="pb-3">
                              Vencimento
                            </th>

                            <th className="pb-3">
                              Valor
                            </th>

                            <th className="pb-3">
                              Pago
                            </th>

                            <th className="pb-3">
                              Saldo
                            </th>

                            <th className="pb-3">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>

                          {parcelasPedido
                            .sort(
                              (a, b) =>
                                a.numero -
                                b.numero
                            )
                            .map(
                              (parcela) => (
                                <tr
                                  key={
                                    parcela.id
                                  }
                                  className="border-b border-slate-50"
                                >

                                  <td className="py-3 font-medium">
                                    {parcela.numero}ª
                                  </td>

                                  <td className="py-3">
                                    {new Date(
                                      `${parcela.vencimento}T00:00:00`
                                    ).toLocaleDateString(
                                      "pt-BR"
                                    )}
                                  </td>

                                  <td className="py-3">
                                    {moeda(
                                      Number(
                                        parcela.valor
                                      )
                                    )}
                                  </td>

                                  <td className="py-3 text-green-600">
                                    {moeda(
                                      Number(
                                        parcela.valor_pago
                                      )
                                    )}
                                  </td>

                                  <td className="py-3 text-red-600">
                                    {moeda(
                                      Number(
                                        parcela.valor
                                      ) -
                                        Number(
                                          parcela.valor_pago
                                        )
                                    )}
                                  </td>

                                  <td className="py-3">

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusParcela(
                                        parcela
                                      )}`}
                                    >
                                      {textoStatus(
                                        parcela.status
                                      )}
                                    </span>

                                  </td>

                                </tr>
                              )
                            )}

                        </tbody>

                      </table>

                    </div>

                    <div className="mt-5 flex justify-end">

                      <button
                        onClick={() =>
                          excluirPedido(
                            pedido.id
                          )
                        }
                        className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        Excluir pedido
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