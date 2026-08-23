import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "ghost" | "danger" | "outline" | "subtle";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-lime-400 text-zinc-950 hover:bg-lime-300 active:bg-lime-500 font-semibold shadow-[0_0_20px_-6px_rgba(163,230,53,0.6)]",
  ghost: "bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700/70",
  danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30",
  outline: "border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/40",
  subtle: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50",
};

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3.5 text-base rounded-2xl",
  };
  return (
    <button
      className={cls(
        "inline-flex items-center justify-center gap-2 transition-colors select-none",
        "disabled:opacity-40 disabled:pointer-events-none",
        buttonStyles[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cls("rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cls(
        "w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100",
        "placeholder:text-zinc-500 outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/20",
        className,
      )}
      {...rest}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

type BadgeTone = "lime" | "zinc" | "amber" | "sky" | "rose" | "emerald";

const badgeTones: Record<BadgeTone, string> = {
  lime: "bg-lime-400/15 text-lime-300 border-lime-400/30",
  zinc: "bg-zinc-700/40 text-zinc-300 border-zinc-600/50",
  amber: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  sky: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  rose: "bg-rose-400/15 text-rose-300 border-rose-400/30",
  emerald: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

export function Badge({ tone = "zinc", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cls(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cls("animate-spin", className ?? "size-5")} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-lime-400">
      <Spinner className="size-8" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-10 text-center">
      <p className="font-semibold text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" onClick={onClose} aria-label="Close">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  big = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  big?: boolean;
}) {
  const btn = cls(
    "flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600 disabled:opacity-30 font-bold select-none",
    big ? "size-12 text-2xl" : "size-9 text-lg",
  );
  return (
    <div className="inline-flex items-center gap-3">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className={cls("tabular text-center font-extrabold", big ? "w-14 text-4xl" : "w-8 text-xl")}>
        {value}
      </span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async (e) => {
        const el = e.currentTarget;
        try {
          await navigator.clipboard.writeText(text);
          const prev = el.textContent;
          el.textContent = "Copied ✓";
          setTimeout(() => {
            el.textContent = prev;
          }, 1500);
        } catch {
          window.prompt("Copy this link:", text);
        }
      }}
    >
      {label}
    </Button>
  );
}
