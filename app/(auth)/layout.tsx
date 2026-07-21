import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold)] text-sm font-bold text-black">
              m
            </div>
            <span className="text-lg font-semibold tracking-tight">myodyssey</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
