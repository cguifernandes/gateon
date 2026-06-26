import { Container } from "@/components/container";
import { PricingPlansSection } from "@/components/pricing-plans-section";

export function PricingSection() {
  return (
    <section className="border-t border-border/60 bg-white py-16 md:py-24">
      <Container>
        <PricingPlansSection mode="marketing" />
      </Container>
    </section>
  );
}
