import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { sound } from "../lib/audio";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "danger"
          ? "btn-danger"
          : "btn-ghost";
  return (
    <button
      type="button"
      className={`${variantClass} ${className}`}
      onClick={(event) => {
        sound.play("click");
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lilac-400/20 bg-ink-850/80 text-lilac-200 transition hover:bg-ink-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function MuteToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(sound.isMuted);
  useEffect(() => {
    setMuted(sound.isMuted);
  }, []);
  return (
    <IconButton
      label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
      aria-pressed={muted}
      className={className}
      onClick={() => {
        const next = !muted;
        sound.setMuted(next);
        setMuted(next);
        if (!next) sound.play("click");
      }}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="m16 9 5 6M21 9l-5 6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      )}
    </IconButton>
  );
}

export function Hearts({ lives, max = 3, animateLost = false }: { lives: number; max?: number; animateLost?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Còn ${lives} trên ${max} trái tim`}>
      {Array.from({ length: max }, (_, index) => {
        const active = index < lives;
        return (
          <span
            key={index}
            className={`text-xl leading-none transition-all duration-300 ${
              active ? "scale-100 opacity-100" : "scale-75 opacity-25 grayscale"
            } ${!active && animateLost ? "animate-pop" : ""}`}
            aria-hidden
          >
            {active ? "❤️" : "🖤"}
          </span>
        );
      })}
    </div>
  );
}

export function ProgressDots({ level, cleared }: { level: number; cleared: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Màn ${level} trên 7, đã qua ${cleared} màn`}>
      {Array.from({ length: 7 }, (_, index) => {
        const number = index + 1;
        const done = number <= cleared;
        const current = number === level;
        return (
          <span
            key={number}
            className={`h-2.5 rounded-full transition-all ${
              current ? "w-6 bg-gold-400" : done ? "w-2.5 bg-mint-400" : "w-2.5 bg-lilac-400/25"
            }`}
          />
        );
      })}
    </div>
  );
}

export function Badge({ children, tone = "lilac" }: { children: ReactNode; tone?: "lilac" | "gold" | "mint" | "rose" }) {
  const tones = {
    lilac: "bg-lilac-400/15 text-lilac-200",
    gold: "bg-gold-400/15 text-gold-300",
    mint: "bg-mint-400/15 text-mint-300",
    rose: "bg-rose-400/15 text-rose-300",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-lilac-400/20 bg-ink-900 shadow-2xl sm:rounded-2xl ${
          wide ? "sm:max-w-4xl" : "sm:max-w-2xl"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-lilac-400/15 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <IconButton label="Đóng" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
