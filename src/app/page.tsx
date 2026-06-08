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
      <section className="found-home-hero relative min-h-screen overflow-hidden">
        <Image
          src="/images/found-hero-mobile-v3.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="found-hero-mobile-img object-cover object-center md:hidden"
        />
        <Image
          src="/images/found-hero-desktop-v3.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="found-hero-desktop-img hidden object-cover object-center md:block"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,9,0.42)_0%,rgba(8,10,9,0.12)_38%,rgba(8,10,9,0.78)_100%)] md:bg-[radial-gradient(circle_at_22%_48%,rgba(8,10,9,0.05)_0%,rgba(8,10,9,0.2)_36%,rgba(8,10,9,0.56)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080A09] to-transparent" />

        <div className="found-hero-shell relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-7 md:px-10">
          <header className="found-hero-header flex items-center justify-between">
            <FoundWordmark className="found-nav-wordmark h-8 w-44 text-white md:hidden" />
            <div className="found-header-spacer hidden md:block" />
            <Link
              href="/onboarding"
              className="found-start-link rounded-full border border-white/18 bg-black/20 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:border-white/40"
            >
              Start
            </Link>
          </header>

          <div className="found-hero-content flex flex-1 items-start pt-12 md:items-center md:pt-0">
            <div className="found-hero-copy max-w-[350px] md:max-w-[590px]">
              <div className="found-desktop-wordmark mb-9 hidden md:block">
                <FoundWordmark className="h-14 w-[330px] text-white" />
              </div>

              <h1 className="found-hero-title text-[2.65rem] font-light leading-[0.98] tracking-normal text-white md:text-7xl">
                Your business beautifully online.
              </h1>
              <p className="found-hero-mobile-copy mt-5 max-w-[310px] text-sm font-medium leading-6 text-white/72 md:hidden">
                Answer a few questions. Found builds the site.
              </p>
              <p className="found-hero-desktop-copy mt-7 hidden max-w-md text-base font-medium leading-8 text-white/70 md:block md:text-lg">
                Answer a few questions. Found turns your work, voice, and location into a website that feels made for you.
              </p>
              <div className="found-hero-actions absolute inset-x-6 bottom-8 flex flex-col gap-3 sm:flex-row md:static md:inset-auto md:mt-9">
                <Link
                  href="/onboarding"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#32D074] px-7 text-xs font-black uppercase tracking-widest text-[#080A09] shadow-[0_0_34px_rgba(50,208,116,0.22)] transition hover:bg-[#5DE894] md:min-h-14 md:px-8 md:text-sm"
                >
                  Build my site
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-black/20 px-7 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md transition hover:border-white/40 md:min-h-14 md:px-8 md:text-sm"
                >
                  See how it works
                </a>
              </div>

              <div className="found-hero-categories mt-16 hidden items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 md:flex">
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
