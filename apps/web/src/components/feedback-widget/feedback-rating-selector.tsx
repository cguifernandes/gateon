"use client";

import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

type FeedbackRatingSelectorProps = {
  value: number | null;
  onChange: (value: number) => void;
};

export function FeedbackRatingSelector({
  value,
  onChange,
}: FeedbackRatingSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">Satisfação</Label>
      <div className="flex gap-1.5">
        {RATING_VALUES.map((rating) => (
          <Button
            key={rating}
            type="button"
            variant={value === rating ? "default" : "outline"}
            size="icon-sm"
            aria-pressed={value === rating}
            onClick={() => onChange(rating)}
          >
            {rating}
          </Button>
        ))}
      </div>
    </div>
  );
}
