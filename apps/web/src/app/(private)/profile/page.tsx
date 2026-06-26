import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserProfile } from "@/lib/server/data/get-user-profile";
import { getUserInitials } from "@/lib/utils";
import { ProfileAccountCard } from "./_components/profile-account-card";
import { ProfileBottomSection } from "./_components/profile-bottom-section";
import { ProfileSessionsSection } from "./_components/profile-sessions-section";
import { ProfileStatsCard } from "./_components/profile-stats-card";

export const metadata: Metadata = {
  title: "Perfil — Gateon",
  description: "Informações da conta, sessões e preferências básicas.",
};

export default async function ProfilePage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect("/login");
  }

  const displayName = profile.user.name ?? profile.user.email;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shadow-sm ring-1 ring-border">
            {profile.user.image ? (
              <AvatarImage src={profile.user.image} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-lg">
              {getUserInitials(profile.user)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight">
              {displayName}
            </h1>
            <p className="text-muted-foreground font-light text-sm">
              {profile.user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileAccountCard profile={profile} />
        <ProfileStatsCard stats={profile.stats} />
      </div>

      <ProfileSessionsSection sessions={profile.sessions} />

      <ProfileBottomSection profile={profile} />
    </div>
  );
}
