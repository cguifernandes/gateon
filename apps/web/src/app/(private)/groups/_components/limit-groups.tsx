"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { useGroupLimit } from "@/contexts/group-limit-context";

export function LimitGroups() {
  const { isAtLimit, maxGroups } = useGroupLimit();

  return (
    <AnimatePresence initial={false}>
      {isAtLimit && (
        <motion.div
          key="limit-groups-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden absolute top-0 left-0 right-0"
        >
          <div className="flex items-center justify-between gap-3 border border-yellow-200 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-500 backdrop-blur-xs dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-500">
            <div className="flex items-center gap-2">
              <BadgeAlertIcon size={18} />
              <span>
                Você atingiu o limite de{" "}
                <strong className="font-semibold">{maxGroups} grupos</strong> do
                seu plano.{" "}
                <span className="cursor-pointer underline underline-offset-2 hover:opacity-80">
                  Faça upgrade para adicionar mais.
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
