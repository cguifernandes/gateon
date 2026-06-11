import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrivacyConsentBanner } from "@/components/privacy-consent-banner";
import {
  readSidebarOpenFromCookies,
  SIDEBAR_STATE_HTML_ATTR,
} from "@/lib/sidebar-storage";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const sidebarOpen = readSidebarOpenFromCookies(cookieStore);

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      {...{
        [SIDEBAR_STATE_HTML_ATTR]: sidebarOpen ? "expanded" : "collapsed",
      }}
      className={cn(
        "h-full antialiased",
        fontInter.variable,
        GeistSans.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col text-foreground">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <PrivacyConsentBanner />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
