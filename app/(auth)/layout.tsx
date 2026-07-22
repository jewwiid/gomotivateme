import { Logo } from "@/components/Logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fffdf8] text-[#292929]">
      <header className="border-b border-[#e9e7df] bg-[#fffdf8]">
        <div className="mx-auto flex h-[4.6rem] max-w-[90rem] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Logo href="/" height={28} />
            <nav className="hidden items-center gap-6 text-sm font-medium text-[#383834] sm:flex">
              <Link href="/explore" className="transition hover:text-[var(--color-primary)]">Explore</Link>
              <Link href="/#how-it-works" className="transition hover:text-[var(--color-primary)]">How it works</Link>
            </nav>
          </div>
          <Link href="/" className="text-sm font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)]">
            Go home
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
