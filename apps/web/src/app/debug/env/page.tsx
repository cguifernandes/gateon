import { notFound } from "next/navigation";
import {
  buildEnvConfigSnapshot,
  isEnvDebugEnabled,
} from "@/lib/env-config-snapshot";

export default function EnvDebugPage() {
  if (!isEnvDebugEnabled()) {
    notFound();
  }

  const variables = buildEnvConfigSnapshot();

  return (
    <main className="min-h-svh bg-[#eff4ff] px-4 py-10 font-sans text-[#0f172a]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-xl shadow-[#3b82f6]/10">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#3b82f6]">Gateon debug</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Environment snapshot (web)
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">
            Valores sensíveis mascarados. Desative em produção removendo{" "}
            <code className="rounded bg-[#f0f4f8] px-1.5 py-0.5">
              ENABLE_ENV_DEBUG
            </code>
            .
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f0f4f8] text-xs uppercase tracking-wide text-[#64748b]">
              <tr>
                <th className="px-4 py-3 font-medium">Variable</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((entry) => (
                <tr
                  key={entry.name}
                  className="border-t border-[#e2e8f0] align-top"
                >
                  <td className="px-4 py-3 font-mono text-xs">{entry.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        entry.set
                          ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                      }
                    >
                      {entry.set ? "set" : "missing"}
                    </span>
                  </td>
                  <td className="px-4 py-3 break-all font-mono text-xs text-[#334155]">
                    {entry.display}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-[#64748b]">
          JSON:{" "}
          <a className="text-[#3b82f6] underline" href="/api/debug/env">
            /api/debug/env
          </a>
        </p>
      </div>
    </main>
  );
}
