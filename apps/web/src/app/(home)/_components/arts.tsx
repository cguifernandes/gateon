"use client";
import { motion } from "motion/react";
import { BellIcon } from "@/components/icons/bell";
import { CheckIcon } from "@/components/icons/check";
import { XIcon } from "@/components/icons/x";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { MockMembrsTable } from "./sections/mock-members-table";

const events = [
  {
    icon: CheckIcon,
    title: "Pagamento recebido",
    description: "Mensagem enviada no privado",
  },
  {
    icon: BellIcon,
    title: "Vencimento próximo",
    description: "Lembrete enviado",
  },
  {
    icon: XIcon,
    title: "Assinatura cancelada",
    description: "Acesso revogado",
  },
];

export function FeatureCardArtEvents() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 pr-1">
      {events.map((event, index) => {
        const Icon = event.icon;

        return (
          <motion.div
            key={event.title}
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
              amount: 0.3,
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: "linear",
            }}
            className="flex gap-x-2 rounded-lg bg-primary/10 p-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary">
              <Icon size={14} className="text-white" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium leading-tight text-foreground">
                {event.title}
              </p>

              <p className="text-[10px] font-light leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const connectionSteps = [
  {
    title: "Conectar Gateon",
    description:
      "Autorize a integração entre sua conta e o Telegram em poucos segundos.",
  },
  {
    title: "Adicionar o bot",
    description:
      "Inclua o Gateon no grupo que será gerenciado automaticamente.",
  },
  {
    title: "Conceder permissões",
    description: "Permita que o bot gerencie membros e automatize os acessos.",
  },
];

export function FeatureCardArtSetup() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <ol className="flex flex-col gap-2">
        {connectionSteps.map((step, index) => (
          <motion.li
            key={step.title}
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
              amount: 0.3,
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: "linear",
            }}
            className="flex items-start gap-2.5 rounded-lg bg-primary/10 p-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs text-white">
              {index + 1}
            </span>

            <div>
              <p className="text-[11px] font-medium leading-tight text-foreground">
                {step.title}
              </p>

              <p className="text-[10px] font-light leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function FeatureCardArtMembersTable() {
  const now = new Date().toISOString();

  const mockGroups: TelegramGroupSummaryDto[] = [
    {
      id: "grp_1",
      telegramChatId: "-1001234567890",
      title: "Comunidade Premium",
      chatPhotoUrl: null,
      type: "supergroup",
      isForum: false,
      botStatus: "ACTIVE",
      connectedAt: now,
      updatedAt: now,
      memberCount: 184,
      trackedMemberCount: 176,
      leftMemberCount: 8,
      trackedMemberLimitPerGroup: 1000,
      trackedMemberLimitReached: false,
      linkedStripePlans: [],
      members: [
        {
          telegramUserId: "5128473912",
          firstName: "João",
          lastName: "Silva",
          profilePhotoUrl: null,
          status: "active",
          joinedAt: now,
          leftAt: null,
          isOwner: false,
          linkedStripePlans: [],
        },
        {
          telegramUserId: "6841930275",
          firstName: "Maria",
          lastName: "Oliveira",
          profilePhotoUrl: null,
          status: "active",
          joinedAt: now,
          leftAt: null,
          isOwner: false,
          linkedStripePlans: [],
        },
        {
          telegramUserId: "7319058461",
          firstName: "Pedro",
          lastName: "Costa",
          profilePhotoUrl: null,
          status: "left",
          joinedAt: now,
          leftAt: now,
          isOwner: false,
          linkedStripePlans: [],
        },
      ],
    },
    {
      id: "grp_2",
      telegramChatId: "-1009876543210",
      title: "Mentoria VIP",
      chatPhotoUrl: null,
      type: "supergroup",
      isForum: false,
      botStatus: "ACTIVE",
      connectedAt: now,
      updatedAt: now,
      memberCount: 92,
      trackedMemberCount: 90,
      leftMemberCount: 2,
      trackedMemberLimitPerGroup: 1000,
      trackedMemberLimitReached: false,
      linkedStripePlans: [],
      members: [
        {
          telegramUserId: "5982713401",
          firstName: "Ana",
          lastName: "Souza",
          profilePhotoUrl: null,
          status: "active",
          joinedAt: now,
          leftAt: null,
          isOwner: false,
          linkedStripePlans: [],
        },
        {
          telegramUserId: "6438125796",
          firstName: "Carlos",
          lastName: "Lima",
          profilePhotoUrl: null,
          status: "active",
          joinedAt: now,
          leftAt: null,
          isOwner: false,
          linkedStripePlans: [],
        },
        {
          telegramUserId: "7893246158",
          firstName: "Fernanda",
          lastName: "Rocha",
          profilePhotoUrl: null,
          status: "left",
          joinedAt: now,
          leftAt: now,
          isOwner: false,
          linkedStripePlans: [],
        },
      ],
    },
  ];

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: false,
        amount: 0.3,
      }}
      transition={{
        duration: 0.4,
        ease: "linear",
      }}
    >
      <MockMembrsTable initialGroups={mockGroups} />
    </motion.div>
  );
}
