export function FieldIllustration() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#dce4d0] bg-[#eaf0de]">
      <div className="absolute left-6 top-6 z-10 rounded-full bg-card/95 px-4 py-2 text-xs font-semibold tracking-wide text-card-foreground">
        Rooted in Sri Lanka
      </div>
      <svg
        viewBox="0 0 560 480"
        fill="none"
        aria-hidden="true"
        className="h-auto w-full"
      >
        <rect width="560" height="480" fill="#eaf0de" />
        <circle cx="415" cy="120" r="48" fill="#ebc66d" />
        <path d="M0 270 145 150l100 92 99-78 216 122v194H0Z" fill="#c7d7b5" />
        <path d="M0 298c130-66 291-51 560-4v186H0Z" fill="#91b28a" />
        <path d="M0 340c179-89 365-7 560 3v137H0Z" fill="#688d61" />
        <path
          d="M-50 407c185-139 367 17 650-29M-40 445c185-139 367 17 650-29M-30 483c185-139 367 17 650-29M-20 521c185-139 367 17 650-29"
          stroke="#d5dfad"
          strokeWidth="17"
        />
        <path
          d="M56 323v-92m0 60c-30 0-37-15-37-31 24 0 37 14 37 31Zm0-23c0-28 14-42 38-42 0 27-14 42-38 42Z"
          stroke="#355e3e"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M473 311v-80m0 53c-23 0-31-13-31-27 21 0 31 12 31 27Zm0-20c0-24 12-36 33-36 0 23-12 36-33 36Z"
          stroke="#355e3e"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/60 bg-card/95 p-5 sm:inset-x-7 sm:bottom-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Our purpose
        </p>
        <p className="mt-2 text-lg font-semibold leading-snug">
          A stronger connection between the field and the market.
        </p>
      </div>
    </div>
  );
}
