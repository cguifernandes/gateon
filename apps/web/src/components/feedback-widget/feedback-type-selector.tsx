"use client";

import { type RefObject, useRef } from "react";
import {
  BadgeAlertIcon,
  type BadgeAlertIconHandle,
} from "@/components/icons/badge-alert";
import {
  CircleCheckIcon,
  type CircleCheckIconHandle,
} from "@/components/icons/circle-check";
import {
  LightbulbIcon,
  type LightbulbIconHandle,
} from "@/components/icons/lightbulb";
import { Button } from "@/components/ui/button";
import type { FeedbackType } from "@/lib/zod/feedback-schemas";
import { Label } from "../ui/label";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

const FEEDBACK_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "PROBLEMA", label: "Problema" },
  { value: "SUGESTAO", label: "Sugestão" },
  { value: "ELOGIO", label: "Elogio" },
];

function FeedbackTypeIcon({
  type,
  iconRef,
}: {
  type: FeedbackType;
  iconRef: RefObject<AnimatedIconHandle | null>;
}) {
  switch (type) {
    case "PROBLEMA":
      return (
        <BadgeAlertIcon
          ref={iconRef as RefObject<BadgeAlertIconHandle | null>}
          size={18}
          isAnimateOnView={false}
        />
      );
    case "SUGESTAO":
      return (
        <LightbulbIcon
          ref={iconRef as RefObject<LightbulbIconHandle | null>}
          size={18}
          isAnimateOnView={false}
        />
      );
    case "ELOGIO":
      return (
        <CircleCheckIcon
          ref={iconRef as RefObject<CircleCheckIconHandle | null>}
          size={18}
          isAnimateOnView={false}
        />
      );
  }
}

type FeedbackTypeButtonProps = {
  option: (typeof FEEDBACK_TYPE_OPTIONS)[number];
  isSelected: boolean;
  onSelect: (value: FeedbackType) => void;
};

function FeedbackTypeButton({
  option,
  isSelected,
  onSelect,
}: FeedbackTypeButtonProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);

  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "outline"}
      aria-pressed={isSelected}
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="h-auto flex-col gap-1 py-2.5"
    >
      <FeedbackTypeIcon type={option.value} iconRef={iconRef} />
      <span className="text-xs">{option.label}</span>
    </Button>
  );
}

type FeedbackTypeSelectorProps = {
  value: FeedbackType | null;
  onChange: (value: FeedbackType) => void;
};

export function FeedbackTypeSelector({
  value,
  onChange,
}: FeedbackTypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">Tipo</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {FEEDBACK_TYPE_OPTIONS.map((option) => (
          <FeedbackTypeButton
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}
