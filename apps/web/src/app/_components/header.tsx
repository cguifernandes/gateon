import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container } from "@/components/container";
import { GateonLogo } from "@/components/gateon-logo";

const navLinks = [
  { href: "#pricing", label: "Preços" },
  { href: "#documentation", label: "Documentação" },
  { href: "#support", label: "Suporte" },
];

export function Header() {
  return (
    <header className="fixed top-4 right-0 left-0 z-50 w-full">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border border-border/80 bg-background/70 px-3 backdrop-blur-md sm:px-5">
          <Link
            href="/"
            className="rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <GateonLogo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                " h-9 w-24",
              )}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-9 w-24 hidden sm:inline-flex",
              )}
            >
              Registrar
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
