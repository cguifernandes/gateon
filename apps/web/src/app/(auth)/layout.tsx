interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-light-beams relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="relative z-10 max-w-lg w-full">{children}</div>
    </main>
  );
}
