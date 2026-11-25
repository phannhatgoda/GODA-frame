"use client";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const cx = clsx;

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none",
        "active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-brand text-white shadow-[0_6px_16px_-6px_rgb(255_90_31/.6)] hover:bg-brand-600",
        variant === "dark" && "bg-ink text-white hover:bg-ink-2",
        variant === "secondary" && "bg-white text-ink border border-line hover:border-ink-3/40 shadow-soft",
        variant === "ghost" && "text-ink-2 hover:bg-black/5",
        variant === "danger" && "bg-white text-bad border border-red-200 hover:bg-red-50",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cx(
        "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition placeholder:text-ink-3/70",
        "focus:border-brand focus:ring-4 focus:ring-brand/10",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={cx(
        "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-ink-3/70",
        "focus:border-brand focus:ring-4 focus:ring-brand/10 resize-none",
        className,
      )}
    />
  );
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cx("h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10", className)}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-line bg-white shadow-soft", className)}>{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "brand" | "bad" | "blue"; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        tone === "neutral" && "bg-stone-100 text-ink-2",
        tone === "ok" && "bg-green-50 text-green-700",
        tone === "warn" && "bg-amber-50 text-amber-700",
        tone === "brand" && "bg-brand-50 text-brand-600",
        tone === "bad" && "bg-red-50 text-red-700",
        tone === "blue" && "bg-blue-50 text-blue-700",
      )}
    >
      {children}
    </span>
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-brand" : "bg-stone-300",
      )}
    >
      <span className={cx("size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx("inline-flex rounded-xl bg-stone-100 p-1", className)}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all whitespace-nowrap",
            value === o.value ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toast ---------- */
type Toast = { id: number; text: string; tone: "ok" | "bad" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "bad") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              "animate-pop pointer-events-auto rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lift",
              t.tone === "ok" ? "bg-ink" : "bg-bad",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Có lỗi xảy ra");
  return data as T;
}

/* ---------- Platform branding (set by the Super Admin) ---------- */
type Brand = { name: string; logoUrl: string };
const SiteCtx = createContext<Brand>({ name: "GODA.Frame", logoUrl: "" });
export const useBrand = () => useContext(SiteCtx);
export function SiteProvider({ value, children }: { value: Brand; children: ReactNode }) {
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>;
}

export function BrandName({ name, dark }: { name: string; dark?: boolean }) {
  const i = name.indexOf(".");
  return (
    <span className={dark ? "text-white" : "text-ink"}>
      {i > 0 ? <>{name.slice(0, i)}<span className="text-brand">.</span>{name.slice(i + 1)}</> : name}
    </span>
  );
}

export function Logo({ className, dark, brand }: { className?: string; dark?: boolean; brand?: Brand }) {
  const ctx = useBrand();
  const b = brand ?? ctx;
  return (
    <span className={cx("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      {b.logoUrl ? (
        // an uploaded logo usually already contains the wordmark
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logoUrl} alt={b.name} className="h-8 w-auto max-w-[180px] object-contain" />
      ) : (
        <>
          <span className="relative grid size-8 place-items-center rounded-[10px] bg-ink text-white">
            <span className="absolute inset-[5px] rounded-[6px] border-2 border-brand" />
            <span className="relative text-[13px] font-extrabold">{(b.name[0] || "G").toUpperCase()}</span>
          </span>
          <BrandName name={b.name} dark={dark} />
        </>
      )}
    </span>
  );
}
