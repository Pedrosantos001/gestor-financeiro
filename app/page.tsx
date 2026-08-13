"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

type Entrada = {
  id: string;
  conta_id: string;
  valor: number;
  data: string;
  conta?: {
    nome: string;
  };
};

type Parcela = {
  id: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: string;
};

type Pagamento = {
  id: string;
  valor: number;
  data: string;
};

type GraficoItem = {
  conta: string;
  valor: number;
};

export default function Home() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [grafico, setGrafico] = useState<GraficoItem[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    setCarregando(true);

    const { data: entradasData, error: entradasError } =
      await supabase
        .from("entradas")
        .select(`
          id,
          conta_id,
          valor,
          data,
          conta:contas(nome)
        `);

    if (entradasError) {
      console.error(entradasError);
    }

    const { data: parcelasData, error: parcelasError } =
      await supabase
        .from("parcelas")
        .select(`
          id,
          valor,
          valor_pago,
          vencimento,
          status
        `);

    if (parcelasError) {
      console.error(parcelasError);
    }

    const { data: pagamentosData, error: pagamentosError } =
      await supabase
        .from("pagamentos")
        .select(`
          id,
          valor,
          data
        `);

    if (pagamentosError) {
      console.error(pagamentosError);
    }

    const entradasSeguras =
      (entradasData as unknown as Entrada[]) || [];

    const parcelasSeguras =
      (parcelasData as unknown as Parcela[]) || [];

    const pagamentosSeguros =
      (pagamentosData as unknown as Pagamento[]) || [];

    setEntradas(entradasSeguras);
    setParcelas(parcelasSeguras);
    setPagamentos(pagamentosSeguros);

    /*
     * TOTAL RECEBIDO
     */

    const totalEntradas =
      entradasSeguras.reduce(
        (total, entrada) =>
          total + Number(entrada.valor),
        0
      );

    /*
     * TOTAL EM ABERTO
     *
     * Cada parcela:
     * valor - valor pago
     */

    const totalEmAberto =
      parcelasSeguras.reduce(
        (total, parcela) =>
          total +
          Math.max(
            Number(parcela.valor) -
              Number(parcela.valor_pago),
            0
          ),
        0
      );

    /*
     * TOTAL PAGO
     */

    const totalPago =
      pagamentosSeguros.reduce(
        (total, pagamento) =>
          total + Number(pagamento.valor),
        0
      );

    /*
     * SOBRA DE CAIXA
     */

    const sobra =
      totalEntradas -
      totalEmAberto;

    const sobraPositiva =
      Math.max(sobra, 0);

    /*
     * RESERVA DE 40%
     */

    const reserva =
      sobraPositiva * 0.4;

    const disponivel =
      sobraPositiva - reserva;

    /*
     * GRÁFICO POR CONTA
     */

    const porConta: Record<
      string,
      number
    > = {};

    entradasSeguras.forEach(
      (entrada) => {
        const relacionamento =
          entrada.conta as
            | { nome: string }
            | { nome: string }[]
            | null
            | undefined;

        const nomeConta =
          Array.isArray(
            relacionamento
          )
            ? relacionamento[0]?.nome ||
              "Conta"
            : relacionamento?.nome ||
              "Conta";

        porConta[nomeConta] =
          (porConta[nomeConta] || 0) +
          Number(entrada.valor);
      }
    );

    setGrafico(
      Object.entries(porConta).map(
        ([conta, valor]) => ({
          conta,
          valor,
        })
      )
    );

    setCarregando(false);
  }

  function moeda(valor: number) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">
          Carregando financeiro...
        </p>
      </main>
    );
  }

  const totalEntradas =
    entradas.reduce(
      (total, entrada) =>
        total + Number(entrada.valor),
      0
    );

  const totalEmAberto =
    parcelas.reduce(
      (total, parcela) =>
        total +
        Math.max(
          Number(parcela.valor) -
            Number(parcela.valor_pago),
          0
        ),
      0
    );

  const totalPago =
    pagamentos.reduce(
      (total, pagamento) =>
        total + Number(pagamento.valor),
      0
    );

  const sobra =
    totalEntradas -
    totalEmAberto;

  const sobraPositiva =
    Math.max(sobra, 0);

  const reserva =
    sobraPositiva * 0.4;

  const disponivel =
    sobraPositiva - reserva;

  const parcelasAtrasadas =
    parcelas.filter(
      (parcela) =>
        parcela.status ===
        "ATRASADA"
    );

  const valorAtrasado =
    parcelasAtrasadas.reduce(
      (total, parcela) =>
        total +
        Math.max(
          Number(parcela.valor) -
            Number(parcela.valor_pago),
          0
        ),
      0
    );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}

        <header className="mb-8">

          <h1 className="text-3xl font-bold text-slate-900">
            Gestão Financeira
          </h1>

          <p className="mt-1 text-slate-500">
            Visão geral da situação financeira.
          </p>

        </header>

        {/* CARDS */}

        <section className="grid gap-4 md:grid-cols-3">

          <Card
            titulo="Total recebido"
            valor={moeda(
              totalEntradas
            )}
          />

          <Card
            titulo="Parcelas em aberto"
            valor={moeda(
              totalEmAberto
            )}
          />

          <Card
            titulo="Total pago"
            valor={moeda(
              totalPago
            )}
          />

          <Card
            titulo="Sobra"
            valor={moeda(sobra)}
          />

          <Card
            titulo="Reserva recomendada"
            valor={moeda(reserva)}
            detalhe="40% da sobra"
          />

          <Card
            titulo="Disponível"
            valor={moeda(
              disponivel
            )}
          />

        </section>

        {/* ALERTA DE ATRASADOS */}

        {parcelasAtrasadas.length >
          0 && (

          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">

            <p className="font-semibold text-red-700">
              Atenção: existem parcelas
              atrasadas.
            </p>

            <p className="mt-1 text-sm text-red-600">
              {parcelasAtrasadas.length}{" "}
              parcela(s) atrasada(s),
              totalizando{" "}
              <strong>
                {moeda(valorAtrasado)}
              </strong>
              .
            </p>

          </section>

        )}

        {/* RESERVA */}

        <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">

          <p className="text-sm text-slate-300">
            Recomendação financeira
          </p>

          <p className="mt-2 text-2xl font-bold">
            Reservar{" "}
            {moeda(reserva)}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            O sistema recomenda reservar
            40% da sobra para investimento
            ou segurança financeira.
          </p>

        </section>

        {/* GRÁFICO */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-6 text-xl font-semibold">
            Entradas por conta
          </h2>

          {grafico.length === 0 ? (

            <div className="flex h-72 items-center justify-center text-slate-400">
              Nenhuma entrada cadastrada.
            </div>

          ) : (

            <div className="h-80 w-full">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={grafico}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="conta"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(valor) =>
                      moeda(
                        Number(valor)
                      )
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="valor"
                    name="Entradas"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          )}

        </section>

        {/* RESUMO */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Resumo financeiro
          </h2>

          <div className="space-y-4">

            <Linha
              nome="Entradas"
              valor={moeda(
                totalEntradas
              )}
            />

            <Linha
              nome="Parcelas em aberto"
              valor={moeda(
                totalEmAberto
              )}
            />

            <Linha
              nome="Total pago"
              valor={moeda(
                totalPago
              )}
            />

            <Linha
              nome="Sobra"
              valor={moeda(sobra)}
            />

            <Linha
              nome="Reserva recomendada — 40%"
              valor={moeda(reserva)}
            />

            <Linha
              nome="Disponível"
              valor={moeda(
                disponivel
              )}
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function Card({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <p className="text-sm text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {valor}
      </p>

      {detalhe && (
        <p className="mt-1 text-xs text-slate-400">
          {detalhe}
        </p>
      )}

    </div>
  );
}

function Linha({
  nome,
  valor,
}: {
  nome: string;
  valor: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">

      <span className="text-slate-600">
        {nome}
      </span>

      <strong className="text-slate-900">
        {valor}
      </strong>

    </div>
  );
}