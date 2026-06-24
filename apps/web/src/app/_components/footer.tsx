import Link from "next/link";
import { Container } from "@/components/container";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border bg-slate-900 py-8 text-slate-400">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm">
            <span className="font-semibold text-white">Gateon</span> · Automação
            de receita no Telegram
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <Link href="/privacy" className="hover:text-white hover:underline">
              Privacidade
            </Link>
            <Link href="/terms" className="hover:text-white hover:underline">
              Termos
            </Link>
            <span>© {currentYear} Gateon. Todos os direitos reservados.</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
