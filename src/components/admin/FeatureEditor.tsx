"use client";
import { FEATURE_GROUPS, FEATURE_META, type FeatureKey, type Features } from "@/lib/features";
import { cx, Input } from "../ui";

/** Checkbox grid for plan features. `base` (optional) marks values that differ from the plan as overrides. */
export function FeatureEditor({ value, onChange, base }: { value: Features; onChange: (k: FeatureKey, v: number | boolean) => void; base?: Features }) {
  return (
    <div className="space-y-4">
      {FEATURE_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g.title}</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {g.keys.map((k) => {
              const m = FEATURE_META[k];
              const custom = base && base[k] !== value[k];
              if (m.kind === "number")
                return (
                  <label key={k} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">{m.label}{custom && <span className="size-1.5 rounded-full bg-brand" title="Tuỳ chỉnh riêng" />}</span>
                      <span className="block truncate text-[11px] text-ink-3">{m.hint}</span>
                    </span>
                    <Input type="number" min={0} className="h-8 w-20 shrink-0 text-right text-sm" value={value[k] as number} onChange={(e) => onChange(k, Math.max(0, Math.round(+e.target.value || 0)))} />
                  </label>
                );
              const on = value[k] as boolean;
              return (
                <button type="button" key={k} onClick={() => onChange(k, !on)} className={cx("flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition", on ? "border-brand/40 bg-brand-50/50" : "border-line hover:border-stone-300")}>
                  <span className={cx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border text-[10px] font-bold text-white", on ? "border-brand bg-brand" : "border-stone-300 bg-white")}>{on && "✓"}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium">{m.label}{custom && <span className="size-1.5 rounded-full bg-brand" title="Tuỳ chỉnh riêng" />}</span>
                    <span className="block text-[11px] text-ink-3">{m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
