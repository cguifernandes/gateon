import Link from "next/link";
import { Container } from "@/components/container";
import { GateonLogo } from "@/components/gateon-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#criadores", label: "Recursos" },
  { href: "#comparacao", label: "Comparações" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="fixed top-4 right-0 left-0 z-50 w-full">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border border-border/80 bg-background/70 px-4 backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-x-8">
            <Link
              className="flex bg-white rounded-full items-center justify-center"
              href="/"
            >
              <GateonLogo />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    buttonVariants({ variant: "link" }),
                    "w-fit h-fit p-0 text-muted-foreground hover:text-primary",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
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
              className={cn(buttonVariants({ size: "sm" }), "h-9 w-24")}
            >
              Registrar
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
