import { Container } from "@/components/container";
import { PricingPlansSection } from "@/components/pricing-plans-section";

export function PricingSection() {
  return (
    <section className="py-16 scroll-mt-24 md:py-24" id="precos">
      <Container>
        <PricingPlansSection mode="marketing" />
      </Container>
    </section>
  );
}
