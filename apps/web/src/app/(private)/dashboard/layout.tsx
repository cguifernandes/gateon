import { PrivacyConsentBanner } from "@/components/privacy-consent-banner";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardRouteLayout({
  children,
}: DashboardRouteLayoutProps) {
  return (
    <>
      {children}
      <PrivacyConsentBanner />
    </>
  );
}
