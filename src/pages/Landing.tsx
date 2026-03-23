import { Brain, ChevronRight, LineChart, Menu, Moon, Shield, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroCarousel } from '../components/Landing/HeroCarousel';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleTheme } from '../store/slices/uiSlice';

const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About' },
  { href: '#insights', label: 'Insights' },
  { href: '#contact', label: 'Contact' },
] as const;

export function Landing() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const token = useAppSelector((s) => s.auth.token);
  const [mobileOpen, setMobileOpen] = useState(false);
  const launchApp = token
    ? { to: '/dashboard' as const, state: undefined }
    : ({ to: '/login' as const, state: { from: '/dashboard' } } as const);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const linkClass =
    'text-sm font-medium text-slate-900 transition-colors hover:text-primary dark:text-white/90 dark:hover:text-white';

  return (
    <div className="min-h-svh bg-canvas text-navy transition-colors duration-300 dark:bg-charcoal dark:text-white">
      <header className="sticky top-0 z-[80] w-full border-b border-[#f1f5f9] bg-white/70 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-navy/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="shrink-0 text-lg font-bold tracking-tight text-slate-900 transition-opacity hover:opacity-90 dark:text-white"
          >
            MORPHEUS
          </Link>

          <nav
            className="hidden flex-1 items-center justify-center gap-10 md:flex"
            aria-label="Primary"
          >
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(href);
                }}
                className={linkClass}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/10"
              onClick={() => dispatch(toggleTheme())}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              ) : (
                <Moon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              )}
            </button>
            <Link to="/login" className={linkClass}>
              Sign in
            </Link>
            <Link
              to={launchApp.to}
              state={launchApp.state}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primaryHover"
            >
              Get Started
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-900 dark:text-white"
              onClick={() => dispatch(toggleTheme())}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              ) : (
                <Moon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-900 dark:text-white"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.25} /> : <Menu className="h-5 w-5" strokeWidth={1.25} />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[#f1f5f9] bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-navy/80 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className={`${linkClass} text-base`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(href);
                  }}
                >
                  {label}
                </a>
              ))}
              <Link
                to="/login"
                className={`${linkClass} text-base`}
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to={launchApp.to}
                state={launchApp.state}
                className="rounded-full bg-primary py-3 text-center text-sm font-semibold text-white hover:bg-primaryHover"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <HeroCarousel
        onEnquire={() => scrollTo('#contact')}
        explorePlatformTo={token ? '/dashboard' : '/login'}
        explorePlatformState={token ? undefined : { from: '/dashboard' }}
      />

      <section id="services" className="landing-mesh-bg scroll-mt-28 px-6 py-[100px]">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl dark:text-white">
              Services
            </h2>
            <p className="mt-5 text-lg leading-[1.6] text-navy/70 dark:text-white/70">
              Institutional-grade tooling with the speed of a product team—glass-clear surfaces, zero noise.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: LineChart,
                title: 'Market intelligence',
                copy: 'Live positioning, sector sentiment, and scenario lenses tuned for Indian and global equities.',
              },
              {
                icon: Brain,
                title: 'AI copilots',
                copy: 'Context-aware assistants trained on your book—not generic chat—so answers stay actionable.',
              },
              {
                icon: Shield,
                title: 'Risk & compliance',
                copy: 'Exposure maps, stress paths, and audit-ready exports without leaving the workflow.',
              },
            ].map(({ icon: Icon, title, copy }) => (
              <div
                key={title}
                className="landing-glass group rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-navy/10 bg-navy/[0.04] text-steel dark:border-white/10 dark:bg-white/5">
                  <Icon className="h-6 w-6" strokeWidth={1.25} />
                </div>
                <h3 className="text-xl font-semibold text-navy dark:text-white">{title}</h3>
                <p className="mt-4 text-base leading-[1.6] text-navy/65 dark:text-white/65">{copy}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary dark:text-steel">
                  Learn more <ChevronRight className="h-4 w-4" strokeWidth={1.25} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="about"
        className="scroll-mt-28 border-t border-navy/10 px-6 py-[100px] dark:border-white/5"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl dark:text-white">
              About
            </h2>
            <p className="mt-6 text-lg leading-[1.6] text-navy/70 dark:text-white/70">
              Morpheus was built for analysts, PMs, and founders who outgrew spreadsheets but refuse clunky
              enterprise software. We combine deterministic models with modern LLMs—always with your data
              boundary in mind.
            </p>
            <p className="mt-5 text-lg leading-[1.6] text-navy/70 dark:text-white/70">
              Our interface language is calm, precise, and dark-first: fewer chrome, more signal. Every surface
              uses glassmorphism sparingly so depth reads as premium, not decorative.
            </p>
          </div>
          <div className="landing-glass rounded-2xl p-10">
            <ul className="space-y-6 text-base leading-[1.6] text-navy/75 dark:text-white/75">
              <li className="flex gap-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-steel" />
                <span>Sub-100ms interactions across watchlists, portfolios, and chat.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-steel" />
                <span>Role-aware workspaces: research, execution, and reporting in one rail.</span>
              </li>
              <li className="flex gap-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-steel" />
                <span>Primary actions in blue; neutrals for everything else.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="insights" className="scroll-mt-28 px-6 py-[100px]">
        <div className="mx-auto max-w-6xl">
          <div className="landing-glass rounded-3xl p-10 md:p-14">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl dark:text-white">
                  Insights
                </h2>
                <p className="mt-5 text-lg leading-[1.6] text-navy/70 dark:text-white/70">
                  Weekly briefs on macro, flows, and factor rotation— distilled for operators, not tourists.
                </p>
              </div>
              <Link
                to={token ? '/recommendations' : '/login'}
                state={token ? undefined : { from: '/recommendations' }}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primaryHover"
              >
                View recommendations
              </Link>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {['Rates & FX pulse', 'India flows', 'AI risk monitor'].map((title) => (
                <div
                  key={title}
                  className="rounded-xl border border-navy/10 bg-navy/[0.03] p-6 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <p className="text-sm font-semibold text-navy dark:text-white">{title}</p>
                  <p className="mt-3 text-sm leading-[1.6] text-navy/55 dark:text-white/55">
                    Placeholder insight deck—wire your CMS.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 px-6 py-[100px] pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl dark:text-white">
            Start a conversation
          </h2>
          <p className="mt-5 text-lg leading-[1.6] text-navy/70 dark:text-white/70">
            Tell us about your stack, data vendors, and compliance needs—we respond within one business day.
          </p>
          <a
            href="mailto:hello@morpheus.app?subject=Enquiry%20from%20website"
            className="mt-10 inline-flex rounded-full bg-primary px-12 py-4 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primaryHover"
          >
            Enquire Now
          </a>
        </div>
      </section>

      <footer className="border-t border-navy/10 px-6 py-12 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-sm text-navy/50 sm:flex-row dark:text-white/50">
          <span className="font-semibold text-navy/80 dark:text-white/80">
            © {new Date().getFullYear()} MORPHEUS
          </span>
          <div className="flex flex-wrap justify-center gap-8">
            <Link
              to="/login"
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              Create account
            </Link>
            <Link
              to={token ? '/dashboard' : '/login'}
              state={token ? undefined : { from: '/dashboard' }}
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
