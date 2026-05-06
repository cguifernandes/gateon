import { Container } from "./container";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer
      className="border-t border-border bg-slate-900 py-8 text-slate-400"
      id="support"
    >
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm">
            <span className="font-semibold text-white">Gateon</span> · Automação
            de receita no Telegram
          </div>
          <div className="text-xs">
            © {currentYear} Gateon. Todos os direitos reservados.
          </div>
        </div>
      </Container>
    </footer>
  );
}
