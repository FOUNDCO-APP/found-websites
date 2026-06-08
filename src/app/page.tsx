import Image from "next/image"
import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

function FoundWordmark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 72" role="img" aria-label="Found">
      <text
        x="0"
        y="56"
        fill="currentColor"
        fontFamily="var(--font-dm-sans), Arial, sans-serif"
        fontSize="58"
        fontWeight="300"
        letterSpacing="25"
      >
        FOUND
      </text>
    </svg>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: FOUND_BLACK }}>
      <section className="relative min-h-screen overflow-hidden">
        <Image
          src="/images/found-signal-green-approved.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_48%,rgba(8,10,9,0)_0%,rgba(8,10,9,0.22)_38%,rgba(8,10,9,0.58)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080A09] to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-7 md:px-10">
          <header className="flex items-center justify-between">
            <FoundWordmark className="h-8 w-44 text-white md:hidden" />
            <div className="hidden text-xs font-black uppercase tracking-[0.24em] text-white/70 md:block">
              Found Co.
            </div>
            <Link
              href="/onboarding"
              className="rounded-full border border-white/18 bg-black/20 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:border-white/40"
            >
              Start
            </Link>
          </header>

          <div className="flex flex-1 items-end pb-10 md:items-center md:pb-0">
            <div className="max-w-[590px]">
              <div className="mb-9 hidden items-center gap-6 md:flex">
                <FoundWordmark className="h-14 w-[330px] text-white" />
                <span className="h-2 w-2 rounded-full bg-[#32D074] shadow-[0_0_24px_rgba(50,208,116,1)]" />
                <span className="h-px w-44 bg-gradient-to-r from-[#32D074] to-transparent" />
              </div>

              <p className="mb-5 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                Found it.
              </p>
              <h1 className="text-5xl font-light leading-[0.98] tracking-normal text-white md:text-7xl">
                Your business beautifully online.
              </h1>
              <div className="mt-7 h-px w-28 bg-gradient-to-r from-[#32D074] to-transparent" />
              <p className="mt-7 max-w-md text-base font-medium leading-8 text-white/70 md:text-lg">
                Answer a few questions. Found turns your work, voice, and location into a website that feels made for you.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#32D074] px-8 text-sm font-black uppercase tracking-widest text-[#080A09] shadow-[0_0_34px_rgba(50,208,116,0.22)] transition hover:bg-[#5DE894]"
                >
                  Build my site
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 bg-black/20 px-8 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition hover:border-white/40"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-16 hidden items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 md:flex">
                <span>Websites</span>
                <span className="text-[#32D074]">•</span>
                <span>Bookings</span>
                <span className="text-[#32D074]">•</span>
                <span>Quotes</span>
                <span className="text-[#32D074]">•</span>
                <span>Social</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#080A09] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                How Found Works
              </p>
              <h2 className="max-w-xl text-4xl font-light leading-tight md:text-6xl">
                No templates. No builder. Just a conversation.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
              {[
                ["01", "Tell Found what you do.", "Business name, services, location, voice, photos, and the feeling of the brand."],
                ["02", "Found shapes the site.", "Industry, imagery, layout, color, copy, and calls to action come together quietly."],
                ["03", "Your business goes live.", "The reveal gives the owner a real site they can open, share, and improve."],
              ].map(([step, title, body]) => (
                <div key={step} className="bg-[#0B0E0C] p-7">
                  <div className="mb-12 text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>{step}</div>
                  <h3 className="text-2xl font-light leading-tight">{title}</h3>
                  <p className="mt-4 text-sm font-bold leading-7 text-white/48">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
