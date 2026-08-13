import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import MobileMenu from "./components/MobileMenu";

export const metadata: Metadata = {
  title: "Gestão Financeira",
  description:
    "Sistema de gestão financeira da empresa",
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100">

        <nav className="relative border-b border-slate-200 bg-white">

          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3">

            {/* LOGO */}

            <Link
              href="/"
              className="shrink-0 text-lg font-bold text-slate-900"
            >
              Gestão Financeira
            </Link>

            {/* MENU DESKTOP */}

            <div className="hidden items-center gap-1 md:flex">

              {menu.map((item) => (
                <Link
                  key={item.rota}
                  href={item.rota}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.nome}
                </Link>
              ))}

            </div>

            {/* MENU CELULAR */}

            <MobileMenu />

          </div>

        </nav>

        {/* CONTEÚDO */}

        <div className="w-full">
          {children}
        </div>

      </body>
    </html>
  );
}