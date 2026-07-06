import Link from "next/link";
import { Container } from "@/components/container";
import { GateonLogo } from "@/components/gateon-logo";
import { EMAIL_SUPPORT } from "@/lib/utils";

const currentYear = new Date().getFullYear();

const productLinks = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#criadores", label: "Recursos" },
  { href: "/#precos", label: "Preços" },
  { href: "/#integracoes", label: "Integrações" },
  { href: "/#faq", label: "FAQ" },
];

const companyLinks = [
  { href: "/privacy", label: "Política de Privacidade" },
  { href: "/terms", label: "Termos de Serviço" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900">
      <Container>
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block">
              <GateonLogo />
            </Link>
            <div className="flex flex-col gap-y-3 mt-2">
              <p className="text-xs leading-relaxed text-slate-400">
                Automatize sua receita recorrente no Telegram. Menos operação,
                mais resultado.
              </p>
              <span className="text-xs leading-relaxed text-slate-400">
                © {currentYear} Gateon. Todos os direitos reservados.
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Produto
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-slate-400 transition-colors hover:text-slate-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Empresa
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-slate-400 transition-colors hover:text-slate-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Suporte
            </h3>
            <a
              href={`mailto:${EMAIL_SUPPORT}`}
              className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-slate-500"
            >
              suporte@gateon.app
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
