"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  error?: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  type?: "email" | "password" | "text";
};

export function FormField({
  error,
  label,
  placeholder,
  registration,
  type = "text",
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={registration.name}>
      <Label htmlFor={registration.name}>{label}</Label>
      <Input
        id={registration.name}
        {...registration}
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        type={type}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
