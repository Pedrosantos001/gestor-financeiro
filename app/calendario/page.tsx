"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Parcela = {
  id: string;
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

export default function CalendarioPage() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [mes, setMes] = useState(new Date());

  useEffect(() => {
    carregarParcelas();
  }, []);

  async function carregarParcelas() {
    const { data, error } = await supabase
      .from("parcelas")
      .select(`
        id,
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
      .order("vencimento");

    if (error) {
      console.error(error);
      return;
    }

    setParcelas(
      (data as unknown as Parcela[]) || []
    );
  }

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const ano = mes.getFullYear();
  const numeroMes = mes.getMonth();

  const primeiroDia = new Date(
    ano,
    numeroMes,
    1
  ).getDay();

  const diasNoMes = new Date(
    ano,
    numeroMes + 1,
    0
  ).getDate();

  const parcelasDoMes = useMemo(() => {
    return parcelas.filter((parcela) => {
      const data = new Date(
        `${parcela.vencimento}T00:00:00`
      );

      return (
        data.getFullYear() === ano &&
        data.getMonth() === numeroMes
      );
    });
  }, [parcelas, ano, numeroMes]);

  function parcelasDoDia(dia: number) {
    const data = `${ano}-${String(
      numeroMes + 1
    ).padStart(2, "0")}-${String(dia).padStart(
      2,
      "0"
    )}`;

    return parcelasDoMes.filter(
      (parcela) =>
        parcela.vencimento === data
    );
  }

  function mudarMes(valor: number) {
    setMes(
      new Date(
        ano,
        numeroMes + valor,
        1
      )
    );
  }

  function voltarHoje() {
    setMes(new Date());
  }

  const totalMes = parcelasDoMes.reduce(
    (total, parcela) =>
      total +
      Math.max(
        Number(parcela.valor) -
          Number(parcela.valor_pago),
        0
      ),
    0
  );

  const totalPago = parcelasDoMes.reduce(
    (total, parcela) =>
      total + Number(parcela.valor_pago),
    0
  );

  const dias = Array.from(
    { length: diasNoMes },
    (_, index) => index + 1
  );

  const semanas = [];
  let semana: (number | null)[] = [];

  for (let i = 0; i < primeiroDia; i++) {
    semana.push(null);
  }

  dias.forEach((dia) => {
    semana.push(dia);

    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  });

  while (semana.length > 0 && semana.length < 7) {
    semana.push(null);
  }

  if (semana.length > 0) {
    semanas.push(semana);
  }

  function statusClasse(parcela: Parcela) {
    if (parcela.status === "PAGA") {
      return "border-green-300 bg-green-50";
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vencimento = new Date(
      `${parcela.vencimento}T00:00:00`
    );

    if (vencimento < hoje) {
      return "border-red-300 bg-red-50";
    }

    return "border-yellow-300 bg-yellow-50";
  }

  function nomeStatus(parcela: Parcela) {
    if (parcela.status === "PAGA") {
      return "Paga";
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vencimento = new Date(
      `${parcela.vencimento}T00:00:00`
    );

    if (vencimento < hoje) {
      return "Atrasada";
    }

    if (
      vencimento.getTime() ===
      hoje.getTime()
    ) {
      return "Hoje";
    }

    return "Pendente";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Calendário Financeiro
          </h1>

          <p className="mt-1 text-slate-500">
            Visualize os vencimentos das parcelas
            dia a dia.
          </p>
        </header>

        {/* RESUMO */}

        <section className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Compromissos do mês
            </p>

            <p className="mt-2 text-2xl font-bold">
              {moeda(totalMes)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Já pago
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {moeda(totalPago)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Parcelas no mês
            </p>

            <p className="mt-2 text-2xl font-bold">
              {parcelasDoMes.length}
            </p>
          </div>

        </section>

        {/* CONTROLES */}

        <section className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">

          <button
            onClick={() => mudarMes(-1)}
            className="rounded-xl px-4 py-2 font-semibold hover:bg-slate-100"
          >
            ←
          </button>

          <div className="flex items-center gap-4">

            <h2 className="text-xl font-bold capitalize">
              {mes.toLocaleDateString(
                "pt-BR",
                {
                  month: "long",
                  year: "numeric",
                }
              )}
            </h2>

            <button
              onClick={voltarHoje}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200"
            >
              Hoje
            </button>

          </div>

          <button
            onClick={() => mudarMes(1)}
            className="rounded-xl px-4 py-2 font-semibold hover:bg-slate-100"
          >
            →
          </button>

        </section>

        {/* CALENDÁRIO */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="grid grid-cols-7 border-b border-slate-200">

            {[
              "Dom",
              "Seg",
              "Ter",
              "Qua",
              "Qui",
              "Sex",
              "Sáb",
            ].map((dia) => (
              <div
                key={dia}
                className="p-3 text-center text-sm font-semibold text-slate-500"
              >
                {dia}
              </div>
            ))}

          </div>

          {semanas.map(
            (semana, index) => (

              <div
                key={index}
                className="grid min-h-32 grid-cols-7 border-b border-slate-100"
              >

                {semana.map(
                  (dia, indice) => {

                    if (!dia) {
                      return (
                        <div
                          key={indice}
                          className="border-r border-slate-100 bg-slate-50"
                        />
                      );
                    }

                    const parcelasDia =
                      parcelasDoDia(dia);

                    return (
<div
  key={`${index}-${indice}-${dia}`}
  className="min-w-0 border-r border-slate-100 p-2"
>
                        <div className="mb-2 text-sm font-semibold text-slate-500">
                          {dia}
                        </div>

                        <div className="space-y-1">

                          {parcelasDia.map(
                            (parcela) => {

                              const pedido =
                                Array.isArray(
                                  parcela.pedido
                                )
                                  ? parcela.pedido[0]
                                  : parcela.pedido;

                              const fornecedor =
                                Array.isArray(
                                  pedido?.fornecedor
                                )
                                  ? pedido
                                      ?.fornecedor[0]
                                  : pedido?.fornecedor;

                              return (

                                <div
                                  key={
                                    parcela.id
                                  }
                                  className={`rounded-lg border p-2 text-xs ${statusClasse(
                                    parcela
                                  )}`}
                                >

                                  <p className="truncate font-bold">
                                    {fornecedor?.nome ||
                                      "Fornecedor"}
                                  </p>

                                  <p className="truncate text-slate-600">
                                    Parcela{" "}
                                    {
                                      parcela.numero
                                    }
                                  </p>

                                  <p className="font-semibold">
                                    {moeda(
                                      Number(
                                        parcela.valor
                                      ) -
                                        Number(
                                          parcela.valor_pago
                                        )
                                    )}
                                  </p>

                                  <p className="text-[10px] font-medium">
                                    {nomeStatus(
                                      parcela
                                    )}
                                  </p>

                                </div>

                              );
                            }
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )
          )}

        </section>

      </div>
    </main>
  );
}