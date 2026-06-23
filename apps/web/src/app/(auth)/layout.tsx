interface AuthLayoutProps {
  children: React.ReactNode;
}

/** Auth server actions call the Nest API; allow extra time for cold starts in production. */
export const maxDuration = 30;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-light-beams relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative z-10 max-w-lg w-full">{children}</div>
    </main>
  );
}
