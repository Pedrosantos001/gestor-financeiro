"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";

type Fechamento = {
  id: string;
  data_inicio: string;
  data_fim: string;
  total_entradas: number;
  total_dividas: number;
  total_pago: number;
  sobra: number;
  reserva_percentual: number;
  reserva_recomendada: number;
  valor_disponivel: number;
  fechado_em: string;
};

export default function FechamentosPage() {
  const [fechamentos, setFechamentos] =
    useState<Fechamento[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data, error } = await supabase
      .from("fechamentos")
      .select(`
        id,
        data_inicio,
        data_fim,
        total_entradas,
        total_dividas,
        total_pago,
        sobra,
        reserva_percentual,
        reserva_recomendada,
        valor_disponivel,
        fechado_em
      `)
      .order("data_inicio", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setFechamentos(data || []);
  }

  function moeda(valor: number) {
    return Number(valor).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function data(valor: string) {
    return new Date(
      `${valor}T00:00:00`
    ).toLocaleDateString("pt-BR");
  }

  function gerarPDF(fechamento: Fechamento) {
    const pdf = new jsPDF();

    pdf.setFontSize(20);
    pdf.text(
      "Fechamento Financeiro",
      20,
      25
    );

    pdf.setFontSize(12);

    pdf.text(
      `Período: ${data(
        fechamento.data_inicio
      )} a ${data(
        fechamento.data_fim
      )}`,
      20,
      38
    );

    pdf.text(
      `Fechado em: ${new Date(
        fechamento.fechado_em
      ).toLocaleString("pt-BR")}`,
      20,
      46
    );

    pdf.line(20, 52, 190, 52);

    let y = 68;

    pdf.setFontSize(14);
    pdf.text("Resumo financeiro", 20, y);

    y += 15;

    pdf.setFontSize(12);

    const linhas = [
      [
        "Total de entradas",
        moeda(
          fechamento.total_entradas
        ),
      ],
      [
        "Compromissos",
        moeda(
          fechamento.total_dividas
        ),
      ],
      [
        "Total pago",
        moeda(
          fechamento.total_pago
        ),
      ],
      [
        "Sobra",
        moeda(fechamento.sobra),
      ],
      [
        `Reserva (${fechamento.reserva_percentual}%)`,
        moeda(
          fechamento.reserva_recomendada
        ),
      ],
      [
        "Valor disponível",
        moeda(
          fechamento.valor_disponivel
        ),
      ],
    ];

    linhas.forEach(([nome, valor]) => {
      pdf.text(nome, 20, y);
      pdf.text(valor, 130, y);
      y += 10;
    });

    y += 10;

    pdf.line(20, y, 190, y);

    y += 15;

    pdf.setFontSize(11);

    pdf.text(
      "Relatório gerado pelo sistema",
      20,
      y
    );

    const nomeArquivo =
      `fechamento-${fechamento.data_inicio}-${fechamento.data_fim}.pdf`;

    pdf.save(nomeArquivo);
  }

  async function compartilhar(
    fechamento: Fechamento
  ) {
    const texto = `
FECHAMENTO FINANCEIRO

Período:
${data(
  fechamento.data_inicio
)} → ${data(fechamento.data_fim)}

Entradas:
${moeda(fechamento.total_entradas)}

Compromissos:
${moeda(fechamento.total_dividas)}

Sobra:
${moeda(fechamento.sobra)}

Reserva recomendada:
${moeda(
  fechamento.reserva_recomendada
)}

Disponível:
${moeda(fechamento.valor_disponivel)}
`.trim();

    if (
      typeof navigator !== "undefined" &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title:
            "Fechamento Financeiro",
          text: texto,
        });

        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(
        texto
      );

      alert(
        "Resumo copiado. Agora você pode colar no WhatsApp ou onde quiser."
      );
    } catch {
      alert(
        "Não foi possível compartilhar automaticamente."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8">

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Histórico de Fechamentos
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Consulte, baixe ou compartilhe os
            fechamentos realizados.
          </p>

        </header>

        {fechamentos.length === 0 ? (

          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Nenhum fechamento realizado ainda.
          </div>

        ) : (

          <div className="space-y-5">

            {fechamentos.map(
              (fechamento) => (

                <div
                  key={fechamento.id}
                  className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"
                >

                  {/* CABEÇALHO */}

                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <h2 className="text-lg font-bold sm:text-xl">
                        {data(
                          fechamento.data_inicio
                        )}
                        {" → "}
                        {data(
                          fechamento.data_fim
                        )}
                      </h2>

                      <p className="text-xs text-slate-400 sm:text-sm">
                        Fechado em{" "}
                        {new Date(
                          fechamento.fechado_em
                        ).toLocaleString(
                          "pt-BR"
                        )}
                      </p>

                    </div>

                    <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      FECHADO
                    </span>

                  </div>

                  {/* VALORES */}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                    <Card
                      titulo="Entradas"
                      valor={moeda(
                        fechamento.total_entradas
                      )}
                    />

                    <Card
                      titulo="Compromissos"
                      valor={moeda(
                        fechamento.total_dividas
                      )}
                    />

                    <Card
                      titulo="Sobra"
                      valor={moeda(
                        fechamento.sobra
                      )}
                    />

                    <Card
                      titulo="Reserva"
                      valor={moeda(
                        fechamento.reserva_recomendada
                      )}
                    />

                    <Card
                      titulo="Disponível"
                      valor={moeda(
                        fechamento.valor_disponivel
                      )}
                    />

                  </div>

                  {/* AÇÕES */}

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">

                    <button
                      onClick={() =>
                        gerarPDF(
                          fechamento
                        )
                      }
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
                    >
                      📄 Baixar PDF
                    </button>

                    <button
                      onClick={() =>
                        compartilhar(
                          fechamento
                        )
                      }
                      className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                    >
                      📤 Compartilhar
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>
    </main>
  );
}

function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-sm text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 text-lg font-bold">
        {valor}
      </p>

    </div>
  );
}