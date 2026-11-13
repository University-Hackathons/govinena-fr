import Link from "next/link";
import { Brand } from "@/components/brand";
import { FieldIllustration } from "@/features/landing/components/field-illustration";

const principles = [
  {
    number: "01",
    title: "Farmers at the centre",
    description:
      "Designed around the everyday market decisions of Sri Lankan farming communities.",
  },
  {
    number: "02",
    title: "Intelligence with purpose",
    description:
      "Exploring how agentic AI can turn agricultural information into useful decision support.",
  },
  {
    number: "03",
    title: "Built for local context",
    description:
      "Grounded in Sri Lanka’s agricultural landscape, local markets, and diverse growing communities.",
  },
] as const;

export function LandingPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-20 rounded-lg bg-background p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-6 sm:px-10">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-6 text-sm font-medium"
        >
          <a href="#about" className="transition-colors hover:text-primary">
            About GoviNena
          </a>
          <Link
            href="/dashboard"
            className="font-semibold text-primary hover:underline"
          >
            Workspace
          </Link>
          <span className="hidden rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            In development
          </span>
        </nav>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-6 sm:px-10">
        <section
          aria-labelledby="intro-heading"
          className="grid items-center gap-12 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
        >
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-primary">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-primary"
              />
              Growing a more informed future
            </p>
            <h1
              id="intro-heading"
              className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
            >
              Better insight.
              <br />
              <span className="text-primary">Stronger harvests.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
              Meet GoviNena, an agentic AI-based farmer market decision support
              system being developed for Sri Lanka.
            </p>
            <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
              Bringing a farmer-first perspective to the connection between
              agriculture, market information, and informed decisions.
            </p>
            <a
              href="#about"
              className="mt-8 inline-flex items-center gap-5 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Discover our vision <span aria-hidden="true">↗</span>
            </a>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              An introduction to the project. Decision support tools are not
              available yet.
            </p>
          </div>
          <FieldIllustration />
        </section>

        <section
          id="about"
          aria-labelledby="about-heading"
          className="scroll-mt-8 border-t border-border py-12 sm:py-16"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary">
                The GoviNena vision
              </p>
              <h2
                id="about-heading"
                className="mt-3 text-3xl font-semibold tracking-tight"
              >
                Local roots. Thoughtful technology.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              A foundation for more accessible agricultural decision support.
            </p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {principles.map((principle) => (
              <article
                key={principle.number}
                className="rounded-2xl border border-border bg-card p-7"
              >
                <span className="text-sm font-semibold text-primary">
                  {principle.number} /
                </span>
                <h3 className="mt-6 text-lg font-semibold">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="font-semibold text-foreground">AgriMarket · GoviNena</p>
          <p>Supporting the future of farming in Sri Lanka.</p>
        </div>
      </footer>
    </>
  );
}
