import type { TemplateId } from "@/lib/types";

/** Tiny visual mock of each guest-page template. */
export function TemplateThumb({ id }: { id: TemplateId }) {
  if (id === "aura")
    return (
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-b from-orange-50 to-rose-100">
        <div className="absolute -left-4 -top-4 size-16 rounded-full bg-orange-300/50 blur-xl" />
        <div className="mx-auto mt-4 h-1.5 w-10 rounded bg-stone-800/70" />
        <div className="mx-auto mt-3 aspect-square w-[62%] rounded-full border-4 border-orange-400 bg-white/70" />
        <div className="mx-auto mt-3 h-4 w-[62%] rounded-md bg-orange-500" />
      </div>
    );
  if (id === "bold")
    return (
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white">
        <div className="h-[42%] bg-gradient-to-br from-orange-500 to-rose-600" />
        <div className="mx-3 -mt-6 h-2 w-3/4 rounded bg-white/90" />
        <div className="mx-auto mt-6 aspect-square w-[55%] rounded-xl bg-stone-100 shadow" />
        <div className="mx-auto mt-2 h-4 w-[55%] rounded-md bg-stone-900" />
      </div>
    );
  if (id === "studio")
    return (
      <div className="relative grid aspect-[3/4] grid-cols-2 gap-1.5 overflow-hidden rounded-xl bg-stone-900 p-2">
        <div className="space-y-1.5 pt-3">
          <div className="h-2 w-full rounded bg-white/80" />
          <div className="h-1.5 w-3/4 rounded bg-white/30" />
          <div className="h-1.5 w-2/3 rounded bg-white/30" />
          <div className="mt-3 h-3 w-3/4 rounded bg-orange-500" />
        </div>
        <div className="rounded-lg bg-white/10" />
      </div>
    );
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#F7F0E4] p-2">
      <div className="h-full rounded-lg border border-amber-700/30 p-2">
        <div className="mx-auto mt-2 h-1.5 w-8 rounded bg-amber-800/50" />
        <div className="mx-auto mt-2 h-2.5 w-3/4 rounded bg-stone-800/70" />
        <div className="mx-auto mt-3 aspect-[4/5] w-[60%] rounded bg-white shadow-sm" />
        <div className="mx-auto mt-2 h-3 w-[60%] rounded-full bg-amber-800" />
      </div>
    </div>
  );
}
