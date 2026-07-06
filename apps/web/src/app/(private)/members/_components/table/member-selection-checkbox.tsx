"use client";

import { Checkbox } from "@/components/ui/checkbox";

type MemberSelectionCheckboxProps = {
  checked: boolean;
  label: string;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function MemberSelectionCheckbox({
  checked,
  label,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
  className,
}: MemberSelectionCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      aria-label={label}
      className={className}
      onCheckedChange={onCheckedChange}
    />
  );
}
