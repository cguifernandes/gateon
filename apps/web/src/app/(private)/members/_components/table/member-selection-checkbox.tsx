"use client";

import { Checkbox } from "@/components/ui/checkbox";

type MemberSelectionCheckboxProps = {
  checked: boolean;
  label: string;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function MemberSelectionCheckbox({
  checked,
  label,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
}: MemberSelectionCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      aria-label={label}
      onCheckedChange={onCheckedChange}
    />
  );
}
