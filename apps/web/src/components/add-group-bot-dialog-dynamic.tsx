"use client";

import dynamic from "next/dynamic";

export const AddGroupBotDialog = dynamic(
  () =>
    import("./add-group-bot-dialog").then((module) => ({
      default: module.AddGroupBotDialog,
    })),
  { ssr: false },
);
