import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Container } from "../container";

const items = [
  {
    name: "Cris R.",
    text: "Integramos o Stripe em um dia. O acesso no Telegram ficou 100% automático.",
  },
  {
    name: "Leo M.",
    text: "Menos inadimplência com lembretes. O que mais gostei foi o painel simples de ler.",
  },
  {
    name: "Dani K.",
    text: "Saí de planilhas e bots soltos. Hoje tudo flui: cobrança, grupo e suporte básico.",
  },
];

function Stars() {
  return (
    <div className="mb-2 flex gap-0.5 text-amber-400" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <title>Estrela</title>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            O que dizem sobre nós:{" "}
            <span className="text-primary">nunca foi tão simples</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Quem vende conteúdo no Telegram sabe: confiança e tempo importam.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <blockquote key={t.name} className="m-0">
              <Card className="h-full border-slate-200/80 bg-surface-container">
                <CardHeader>
                  <Stars />
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </CardContent>
                <CardFooter className="text-sm font-semibold text-foreground">
                  — {t.name}
                </CardFooter>
              </Card>
            </blockquote>
          ))}
        </div>
      </Container>
    </section>
  );
}
