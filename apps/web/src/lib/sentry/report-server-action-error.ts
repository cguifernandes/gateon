import { reportBffError } from "./report-bff-error";

type ReportServerActionErrorInput = {
  action: string;
  upstreamPath: string;
  method?: string;
  status?: number;
  message: string;
  error?: unknown;
};

export async function reportServerActionError(
  input: ReportServerActionErrorInput,
): Promise<void> {
  await reportBffError({
    area: "server-action",
    route: input.action,
    method: input.method ?? "POST",
    upstreamPath: input.upstreamPath,
    status: input.status,
    message: input.message,
    error: input.error,
  });
}
