const SIGNAL_GREEN = "#32D074"

export default function SitePausedNotice({ businessName }: { businessName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
        {businessName}
      </p>
      <h1 className="mb-4 max-w-lg text-3xl font-normal leading-tight text-white">
        This site is temporarily unavailable.
      </h1>
      <p className="max-w-md text-sm leading-7 text-white/50">
        Please check back soon.
      </p>
    </div>
  )
}
