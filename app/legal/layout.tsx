import { Header } from "@/components/Header";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
