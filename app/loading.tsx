export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fffdf8] px-5">
      <div className="w-full max-w-md space-y-5">
        <div className="h-3 w-24 animate-pulse rounded bg-[#e5e4de]" />
        <div className="h-12 w-4/5 animate-pulse rounded bg-[#edede8]" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-[#edede8]" />
        <div className="mt-10 h-2 w-full animate-pulse rounded-full bg-[#dce5ff]" />
      </div>
    </div>
  );
}
