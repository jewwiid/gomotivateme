import { Header } from "@/components/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header />
      <main className="flex flex-1 items-center px-5 py-12 sm:px-8 sm:py-20">
        <div className="shell-content grid w-full items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(28rem,1.2fr)] lg:gap-20">
          <div className="mx-auto w-full max-w-md">{children}</div>
          <aside className="relative hidden aspect-square overflow-hidden lg:block" aria-label="The beginning of a goal journey">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/journey/begin.webp"
              alt="A person taking their first step onto a mountain trail"
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
