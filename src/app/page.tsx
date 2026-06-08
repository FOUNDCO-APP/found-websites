import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

function DeviceStage() {
  return (
    <div className="relative mx-auto min-h-[520px] w-full max-w-[720px] lg:min-h-[620px]" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#32D074]/18" />
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
      <div className="absolute left-[6%] top-[10%] hidden h-[260px] w-[430px] -rotate-6 rounded-[34px] border border-white/12 bg-white/[0.035] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.55)] md:block">
        <div className="h-full rounded-[25px] bg-[#F5F7F4] p-6 text-[#080A09]">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]">Barrio Builders</div>
            <div className="h-2 w-14 rounded-full bg-[#32D074]" />
          </div>
          <div className="mt-12 max-w-[260px]">
            <div className="h-8 w-56 rounded-full bg-[#080A09]" />
            <div className="mt-4 h-3 w-64 rounded-full bg-black/18" />
            <div className="mt-2 h-3 w-44 rounded-full bg-black/12" />
            <div className="mt-7 h-10 w-36 rounded-full bg-[#32D074]" />
          </div>
        </div>
      </div>

      <div className="absolute right-[6%] top-[3%] h-[500px] w-[250px] rounded-[48px] border border-white/16 bg-[#131713] p-3 shadow-[0_35px_120px_rgba(0,0,0,0.65)]">
        <div className="h-full overflow-hidden rounded-[36px] bg-[#F5F7F4] text-[#080A09]">
          <div className="h-56 bg-[#101110] p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="h-2 w-16 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-[#32D074] shadow-[0_0_22px_rgba(50,208,116,0.9)]" />
            </div>
            <div className="mt-24">
              <div className="h-7 w-32 rounded-full bg-white" />
              <div className="mt-3 h-2 w-24 rounded-full bg-white/30" />
            </div>
          </div>
          <div className="space-y-3 p-6">
            <div className="h-3 w-20 rounded-full bg-black/80" />
            <div className="h-16 rounded-2xl bg-black/[0.07]" />
            <div className="h-16 rounded-2xl bg-black/[0.07]" />
            <div className="h-11 rounded-full bg-[#32D074]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-[6%] left-[3%] h-[190px] w-[330px] rotate-[5deg] rounded-[28px] border border-white/12 bg-white/[0.04] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="h-full rounded-[20px] bg-[#111] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="h-2 w-20 rounded-full bg-[#32D074]" />
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Live</div>
          </div>
          <div className="mt-12 h-7 w-44 rounded-full bg-white" />
          <div className="mt-3 h-2 w-56 rounded-full bg-white/24" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: FOUND_BLACK }}>
      <section className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#32D074]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-white/[0.045] blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-7 md:px-10">
          <header className="flex items-center justify-between">
            <div className="text-sm font-black uppercase tracking-[0.24em] text-white">Found</div>
            <Link
              href="/onboarding"
              className="rounded-full border border-white/14 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-white/35"
            >
              Start
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="max-w-2xl">
              <p className="mb-7 inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                <span className="h-2 w-2 rounded-full bg-[#32D074] shadow-[0_0_22px_rgba(50,208,116,0.9)]" />
                Pure Studio
              </p>
              <h1 className="text-6xl font-black leading-none tracking-normal sm:text-7xl lg:text-8xl">
                Get Found.
              </h1>
              <p className="mt-7 max-w-xl text-xl leading-9 text-white/62">
                Answer a few questions. Watch your business become beautifully online.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#32D074] px-8 text-sm font-black uppercase tracking-widest text-[#080A09] transition hover:bg-[#5DE894]"
                >
                  Build my site
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/16 px-8 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35"
                >
                  See how it works
                </a>
              </div>
            </div>

            <DeviceStage />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/[0.08] bg-[#0B0E0C] px-6 py-24 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              How Found Works
            </p>
            <h2 className="max-w-xl text-4xl font-black leading-tight md:text-6xl">
              No templates. No builder. Just a conversation.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["01", "Tell Found what you do.", "Business name, services, location, voice, photos, and the feeling of the brand."],
              ["02", "Found shapes the site.", "Industry manifest, curated imagery, layout, color, copy, and calls to action come together quietly."],
              ["03", "Your business goes live.", "The reveal gives the owner a real site they can open, share, and improve."],
            ].map(([step, title, body]) => (
              <div key={step} className="border border-white/[0.09] bg-white/[0.035] p-6">
                <div className="mb-10 text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>{step}</div>
                <h3 className="text-2xl font-black leading-tight">{title}</h3>
                <p className="mt-4 text-sm font-bold leading-7 text-white/50">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F7F4] px-6 py-24 text-[#080A09] md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <h2 className="max-w-3xl text-5xl font-black leading-none md:text-7xl">
              The owner never sees the backend.
            </h2>
            <p className="text-lg font-bold leading-8 text-black/55">
              Found makes the technical decisions silently: layout, imagery, copy, service areas, CTAs, and launch. The owner gets the feeling of opening something made for them.
            </p>
          </div>
          <div className="mt-12 h-1 w-24 rounded-full bg-[#32D074]" />
        </div>
      </section>
    </main>
  )
}
