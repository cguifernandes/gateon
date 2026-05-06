import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gateon — Receita recorrente no Telegram",
  description:
    "Automatize cobranças, acesso a grupos e retenção no Telegram com os gateways que você já usa.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full antialiased",
        fontInter.variable,
        GeistSans.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
