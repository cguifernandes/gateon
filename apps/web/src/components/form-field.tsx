"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.ComponentProps<"input"> & {
  error?: string;
  label: string;
  registration: UseFormRegisterReturn;
};

export function FormField({
  error,
  label,
  registration,
  ...props
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={registration.name}>
      <Label htmlFor={registration.name}>{label}</Label>
      <Input
        id={registration.name}
        {...registration}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
