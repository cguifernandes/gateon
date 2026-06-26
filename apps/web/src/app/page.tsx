import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { FaqSection } from "./_components/sections/faq";
import { FeaturesSection } from "./_components/sections/features";
import { Hero } from "./_components/sections/hero";
import { IntegrationsSection } from "./_components/sections/integrations";
import { ManagementSection } from "./_components/sections/management";
import { MetricsSection } from "./_components/sections/metrics";
import { PricingSection } from "./_components/sections/pricing";
import { StepsSection } from "./_components/sections/steps";
import { TestimonialsSection } from "./_components/sections/testimonials";

export default function Home() {
  return (
    <div className="flex bg-linear-to-b from-surface-container to-surface-bright min-h-screen flex-col">
      <Header />
      <main className="flex-1 mt-20">
        <Hero />
        <FeaturesSection />
        <IntegrationsSection />
        <PricingSection />
        {/* <ManagementSection />
        <MetricsSection />
        <TestimonialsSection />
        <StepsSection />
        <FaqSection /> */}
      </main>
      <Footer />
    </div>
  );
}
