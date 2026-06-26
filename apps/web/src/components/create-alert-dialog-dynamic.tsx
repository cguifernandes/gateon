"use client";

import dynamic from "next/dynamic";

export const CreateAlertDialog = dynamic(
  () =>
    import("./create-alert-dialog").then((module) => ({
      default: module.CreateAlertDialog,
    })),
  { ssr: false },
);
