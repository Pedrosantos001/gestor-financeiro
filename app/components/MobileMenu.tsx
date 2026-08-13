"use client";

import { useState } from "react";
import Link from "next/link";

const menu = [
  { nome: "Dashboard", rota: "/" },
  { nome: "Contas", rota: "/contas" },
  { nome: "Fornecedores", rota: "/fornecedores" },
  { nome: "Pedidos", rota: "/pedidos" },
  { nome: "Entradas", rota: "/entradas" },
  { nome: "Pagamentos", rota: "/pagamentos" },
  { nome: "Calendário", rota: "/calendario" },
  { nome: "Fechamento", rota: "/fechamento" },
  { nome: "Histórico", rota: "/fechamentos" },
];

export default function MobileMenu() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="md:hidden">

      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="rounded-xl border border-slate-200 p-3 text-slate-700 hover:bg-slate-100"
        aria-label="Abrir menu"
      >
        {aberto ? "✕" : "☰"}
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white p-3 shadow-lg">

          <div className="grid gap-1">

            {menu.map((item) => (
              <Link
                key={item.rota}
                href={item.rota}
                onClick={() => setAberto(false)}
                className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.nome}
              </Link>
            ))}

          </div>

        </div>
      )}

    </div>
  );
}