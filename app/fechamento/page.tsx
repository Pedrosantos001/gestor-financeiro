"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Entrada = {
  id: string;
  conta_id: string;
  valor: number;
  data: string;
  observacao: string | null;
};

type Conta = {
  id: string;
  nome: string;
};

type Parcela = {
  id: string;
  pedido_id: string;
  numero: number;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: string;
  pedido?: {
    descricao: string;
    fornecedor?: {
      nome: string;
    };
  };
};

export default function FechamentoPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [calculado, setCalculado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    definirPeriodo();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  function formatarData(data: Date) {
    return data.toISOString().split("T")[0];
  }

  function definirPeriodo() {
    const hoje = new Date();

    const diaSemana = hoje.getDay();

    const diferencaSegunda =
      diaSemana === 0
        ? -6
        : 1 - diaSemana;

    const segunda = new Date(hoje);

    segunda.setDate(
      hoje.getDate() + diferencaSegunda
    );

    setDataInicio(formatarData(segunda));
    setDataFim(formatarData(hoje));
  }

  async function carregarDados() {
    setCarregando(true);

    const { data: contasData, error: contasError } =
      await supabase
        .from("contas")
        .select("id, nome")
        .eq("ativa", true)
        .order("nome");

    if (contasError) {
      console.error(
        "Erro ao carregar contas:",
        contasError
      );
    }

    const { data: entradasData, error: entradasError } =
      await supabase
        .from("entradas")
        .select(`
          id,
          conta_id,
          valor,
          data,
          observacao
        `)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", {
          ascending: true,
        });

    if (entradasError) {
      console.error(
        "Erro ao carregar entradas:",
        entradasError
      );
    }

    const { data: parcelasData, error: parcelasError } =
      await supabase
        .from("parcelas")
        .select(`
          id,
          pedido_id,
          numero,
          valor,
          valor_pago,
          vencimento,
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
      console.error(
        "Erro ao carregar parcelas:",
        parcelasError
      );
    }

    setContas(contasData || []);
    setEntradas(
      (entradasData as Entrada[]) || []
    );

    setParcelas(
      (parcelasData as unknown as Parcela[]) ||
        []
    );

    setCalculado(false);
    setCarregando(false);
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

  function restanteParcela(
    parcela: Parcela
  ) {
    return Math.max(
      Number(parcela.valor) -
        Number(parcela.valor_pago),
      0
    );
  }

  function calcularDias(
    vencimento: string
  ) {
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const data = new Date(
      `${vencimento}T00:00:00`
    );

    return Math.ceil(
      (data.getTime() -
        hoje.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  /*
   * ENTRADAS DO PERÍODO
   */

  const totalEntradas =
    entradas.reduce(
      (total, entrada) =>
        total + Number(entrada.valor),
      0
    );

  /*
   * ENTRADAS AGRUPADAS POR CONTA
   */

  const entradasPorConta = contas.map(
    (conta) => {
      const total = entradas
        .filter(
          (entrada) =>
            entrada.conta_id === conta.id
        )
        .reduce(
          (soma, entrada) =>
            soma + Number(entrada.valor),
          0
        );

      return {
        ...conta,
        total,
      };
    }
  );

  /*
   * PARCELAS PRIORITÁRIAS
   *
   * Vencidas, hoje e próximos 15 dias.
   */

  const parcelasPrioritarias =
    parcelas.filter((parcela) => {
      const dias = calcularDias(
        parcela.vencimento
      );

      return dias <= 15;
    });

  const parcelasFuturas =
    parcelas.filter((parcela) => {
      const dias = calcularDias(
        parcela.vencimento
      );

      return dias > 15;
    });

  const totalPrioritario =
    parcelasPrioritarias.reduce(
      (total, parcela) =>
        total +
        restanteParcela(parcela),
      0
    );

  const totalFuturo =
    parcelasFuturas.reduce(
      (total, parcela) =>
        total +
        restanteParcela(parcela),
      0
    );

  /*
   * SOBRA
   */

  const sobra =
    totalEntradas -
    totalPrioritario;

  const sobraPositiva =
    Math.max(sobra, 0);

  /*
   * RESERVA 40%
   */

  const reserva =
    sobraPositiva * 0.4;

  const disponivel =
    sobraPositiva - reserva;

  const listaPrioridades = [
    ...parcelasPrioritarias,
  ].sort(
    (a, b) =>
      new Date(
        `${a.vencimento}T00:00:00`
      ).getTime() -
      new Date(
        `${b.vencimento}T00:00:00`
      ).getTime()
  );

  function statusPrioridade(
    parcela: Parcela
  ) {
    const dias = calcularDias(
      parcela.vencimento
    );

    if (dias < 0) {
      return {
        texto: "VENCIDA",
        classe:
          "bg-red-100 text-red-700",
      };
    }

    if (dias === 0) {
      return {
        texto: "HOJE",
        classe:
          "bg-orange-100 text-orange-700",
      };
    }

    return {
      texto: `${dias} dias`,
      classe:
        "bg-yellow-100 text-yellow-700",
    };
  }

  function detalhesPedido(
    parcela: Parcela
  ) {
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

    return {
      pedido,
      fornecedor,
    };
  }

  async function salvarFechamento() {
    if (!calculado) {
      alert(
        "Clique em calcular fechamento primeiro."
      );
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from("fechamentos")
      .insert({
        data_inicio: dataInicio,
        data_fim: dataFim,
        total_entradas: totalEntradas,
        total_dividas: totalPrioritario,
        total_pago: 0,
        sobra: sobraPositiva,
        reserva_percentual: 40,
        reserva_recomendada: reserva,
        valor_disponivel: disponivel,
      });

    setSalvando(false);

    if (error) {
      console.error(
        "Erro ao salvar fechamento:",
        error
      );

      alert(
        "Erro ao salvar fechamento."
      );

      return;
    }

    alert(
      "Fechamento salvo com sucesso!"
    );
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">
          Carregando fechamento...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <header className="mb-8">

          <h1 className="text-3xl font-bold text-slate-900">
            Fechamento Financeiro
          </h1>

          <p className="mt-1 text-slate-500">
            O sistema busca automaticamente as
            entradas do período e calcula os
            compromissos.
          </p>

        </header>

        {/* PERÍODO */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Período do fechamento
          </h2>

          <div className="grid gap-4 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm text-slate-500">
                Data inicial
              </label>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) =>
                  setDataInicio(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm text-slate-500">
                Data final
              </label>

              <input
                type="date"
                value={dataFim}
                onChange={(e) =>
                  setDataFim(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />

            </div>

          </div>

          <button
            onClick={carregarDados}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Atualizar período
          </button>

        </section>

        {/* ENTRADAS */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Entradas encontradas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Esses valores vêm diretamente da
              aba Entradas.
            </p>

          </div>

          {entradasPorConta.length ===
          0 ? (

            <div className="rounded-xl bg-yellow-50 p-4 text-yellow-700">
              Nenhuma conta encontrada.
            </div>

          ) : (

            <div className="space-y-3">

              {entradasPorConta.map(
                (conta) => (
                  <div
                    key={conta.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                  >

                    <span className="font-medium text-slate-700">
                      {conta.nome}
                    </span>

                    <strong className="text-green-600">
                      {moeda(conta.total)}
                    </strong>

                  </div>
                )
              )}

              <div className="mt-5 border-t border-slate-100 pt-5">

                <div className="flex items-center justify-between">

                  <span className="font-semibold">
                    Total recebido no período
                  </span>

                  <strong className="text-2xl text-green-600">
                    {moeda(totalEntradas)}
                  </strong>

                </div>

              </div>

            </div>

          )}

        </section>

        {/* RESULTADO */}

        <section className="mb-6 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Entradas
            </p>

            <p className="mt-2 text-2xl font-bold">
              {moeda(totalEntradas)}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Compromissos ≤ 15 dias
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {moeda(totalPrioritario)}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Sobra
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {moeda(sobraPositiva)}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Reserva 40%
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {moeda(reserva)}
            </p>

          </div>

        </section>

        {/* RECOMENDAÇÃO */}

        <section className="mb-6 rounded-2xl bg-slate-900 p-8 text-white shadow-sm">

          <p className="text-sm text-slate-300">
            Recomendação de reserva
          </p>

          <p className="mt-2 text-4xl font-bold">
            {moeda(reserva)}
          </p>

          <p className="mt-2 text-sm text-slate-400">
            40% da sobra após considerar os
            compromissos prioritários.
          </p>

          <div className="mt-5 border-t border-slate-700 pt-5">

            <p className="text-sm text-slate-400">
              Disponível depois da reserva
            </p>

            <p className="mt-1 text-2xl font-bold text-white">
              {moeda(disponivel)}
            </p>

          </div>

        </section>

        {/* ORDEM DE PAGAMENTO */}

        <section className="mb-6 rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <h2 className="text-xl font-semibold">
              Ordem de pagamento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Vencidas, vencendo hoje e parcelas
              dos próximos 15 dias.
            </p>

          </div>

          {listaPrioridades.length ===
          0 ? (

            <div className="p-8 text-center text-slate-500">
              Nenhum compromisso prioritário
              encontrado.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {listaPrioridades.map(
                (parcela, index) => {

                  const status =
                    statusPrioridade(
                      parcela
                    );

                  const {
                    pedido,
                    fornecedor,
                  } =
                    detalhesPedido(
                      parcela
                    );

                  return (

                    <div
                      key={parcela.id}
                      className="p-6"
                    >

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                              {index + 1}
                            </span>

                            <h3 className="font-semibold">
                              {fornecedor?.nome ||
                                "Fornecedor"}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}
                            >
                              {status.texto}
                            </span>

                          </div>

                          <p className="mt-2 text-sm font-medium text-slate-700">
                            {pedido?.descricao ||
                              "Pedido"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Parcela{" "}
                            {parcela.numero}
                            {" · "}
                            Vencimento{" "}
                            {new Date(
                              `${parcela.vencimento}T00:00:00`
                            ).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-sm text-slate-400">
                            Saldo
                          </p>

                          <p className="text-xl font-bold text-red-600">
                            {moeda(
                              restanteParcela(
                                parcela
                              )
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* FUTURO */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Compromissos futuros
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Parcelas após os próximos 15 dias.
              </p>

            </div>

            <strong className="text-xl">
              {moeda(totalFuturo)}
            </strong>

          </div>

        </section>

        {/* BOTÃO DE CÁLCULO */}

        <button
          onClick={() =>
            setCalculado(true)
          }
          className="mb-4 w-full rounded-xl bg-slate-900 px-5 py-4 font-semibold text-white hover:bg-slate-800"
        >
          Confirmar cálculo do fechamento
        </button>

        {calculado && (

          <button
            onClick={salvarFechamento}
            disabled={salvando}
            className="mb-8 w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : "Salvar fechamento"}
          </button>

        )}

      </div>
    </main>
  );
}