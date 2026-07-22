import { Header } from "@/components/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fffdf8] text-[#292929]">
      <Header />
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
