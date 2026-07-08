import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { NavigationProgressBar } from "@/components/navigation-progress-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  readSidebarOpenFromCookies,
  SIDEBAR_STATE_HTML_ATTR,
} from "@/lib/ui/sidebar-storage";
import { cn } from "@/lib/utils";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gateon.com.br"),

  title: {
    default: "Gateon",
    template: "%s",
  },

  description:
    "Automatize seu WhatsApp e Telegram com uma plataforma completa para empresas.",

  openGraph: {
    title: "Gateon — Receita recorrente no Telegram",
    description:
      "Automatize seu WhatsApp e Telegram com uma plataforma completa para empresas.",
    url: "https://gateon.com.br",
    siteName: "Gateon",
    locale: "pt_BR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Gateon — Receita recorrente no Telegram",
    description:
      "Automatize seu WhatsApp e Telegram com uma plataforma completa para empresas.",
  },

  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: "/apple-icon.png",
  },
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
          <NavigationProgressBar />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
