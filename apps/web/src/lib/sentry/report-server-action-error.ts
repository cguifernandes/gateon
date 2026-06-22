import { reportBffError } from "./report-bff-error";

type ReportServerActionErrorInput = {
  action: string;
  upstreamPath: string;
  method?: string;
  status?: number;
  message: string;
  error?: unknown;
};

export function reportServerActionError(input: ReportServerActionErrorInput) {
  reportBffError({
    area: "server-action",
    route: input.action,
    method: input.method ?? "POST",
    upstreamPath: input.upstreamPath,
    status: input.status,
    message: input.message,
    error: input.error,
  });
}
