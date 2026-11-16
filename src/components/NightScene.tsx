import type { ReactNode } from "react";

export function NightSky({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c0c3d] via-[#120a28] to-[#0b0518]" />
      <div className="bg-stars absolute inset-0 opacity-80" />
      <div className="absolute right-3 top-24 h-24 w-24 rounded-full bg-[#fff2c9] opacity-90 shadow-[0_0_80px_30px_rgba(246,196,83,0.18)] sm:right-10 sm:top-24 sm:h-36 sm:w-36" />
      <div className="absolute right-14 top-32 h-5 w-5 rounded-full bg-[#e8d7a8]/40 sm:right-24 sm:top-36 sm:h-7 sm:w-7" />
      <div className="absolute -left-16 bottom-0 h-44 w-72 rounded-[50%] bg-[#160c30]" />
      <div className="absolute -right-12 bottom-0 h-40 w-64 rounded-[50%] bg-[#180d34]" />
      <svg
        className="absolute bottom-0 left-1/2 w-[560px] max-w-none -translate-x-1/2 opacity-60 sm:w-[760px]"
        viewBox="0 0 760 220"
        fill="none"
      >
        <path d="M0 220V190h42v-26h24v-72l22-18 22 18v72h18v-40h20v-58l20-16 20 16v58h20v40h18v-96l26-22 26 22v96h20v-52h22v-70l20-16 20 16v70h22v52h18v-30h24v-70l22-18 22 18v70h20v-44h18v-84l24-20 24 20v84h18v44h22v-64l20-16 20 16v64h24v30h42v30H0Z" fill="#0a0418" />
        <path d="M250 178v-34h12v-14l10-8 10 8v14h12v34h-44Z" fill="#f6c453" opacity=".35" />
        <path d="M470 186v-40h10v-12l9-7 9 7v12h10v40h-38Z" fill="#f6c453" opacity=".3" />
      </svg>
    </div>
  );
}

export function NightScene({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <NightSky />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
