import type { Metadata } from "next";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { ComparisonSection } from "./_components/sections/comparison";
import { CtaSection } from "./_components/sections/cta-card";
import { FaqSection } from "./_components/sections/faq";
import { FeaturesSection } from "./_components/sections/features";
import { Hero } from "./_components/sections/hero";
import { IntegrationsSection } from "./_components/sections/integrations";
import { PricingSection } from "./_components/sections/pricing";

export const metadata: Metadata = {
  title: "Home — Gateon",
  description: "Automatize sua Receita Recorrente no Telegram.",
};

export default function Home() {
  return (
    <div className="flex bg-linear-to-b from-surface-container to-surface-bright min-h-screen flex-col">
      <Header />
      <main className="flex-1 mt-20">
        <Hero />
        <FeaturesSection />
        <IntegrationsSection />
        <ComparisonSection />
        <PricingSection />
        <CtaSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
