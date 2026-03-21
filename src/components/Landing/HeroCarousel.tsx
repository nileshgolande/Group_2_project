import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store';

type ThemeMode = 'light' | 'dark';

type MediaPair = { light: string; dark: string };

type VideoSlide = {
  id: string;
  type: 'video';
  src: string;
  poster: MediaPair;
  badge: string;
  line1: string;
  line2: string;
  description: string;
};

type ImageSlide = {
  id: string;
  type: 'image';
  image: MediaPair;
  badge: string;
  line1: string;
  line2: string;
  description: string;
};

type HeroSlide = VideoSlide | ImageSlide;

/** Light / dark art direction: brighter stills for light mode, moodier for dark. */
const SLIDES: readonly HeroSlide[] = [
  {
    id: 'live-markets',
    type: 'video',
    src: 'https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4',
    poster: {
      light:
        'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1920&q=80',
      dark: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80',
    },
    badge: 'AI-powered institutional analytics',
    line1: 'Clarity in every',
    line2: 'market decision',
    description:
      'Morpheus unifies portfolio intelligence, risk, and narrative insight—built for teams who treat capital as a craft.',
  },
  {
    id: 'trading-floor',
    type: 'image',
    image: {
      light:
        'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=2400&q=85',
      dark: 'https://images.unsplash.com/photo-1642790106117-556e7f6fc160?auto=format&fit=crop&w=2400&q=85',
    },
    badge: 'Real-time conviction',
    line1: 'See the book',
    line2: 'before the headline',
    description:
      'Live positioning, flows, and factor lenses—so your desk reacts to structure, not noise.',
  },
  {
    id: 'data-motion',
    type: 'video',
    src: 'https://videos.pexels.com/video-files/7943052/7943052-hd_1920_1080_25fps.mp4',
    poster: {
      light:
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
      dark: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    },
    badge: 'Models + narrative',
    line1: 'Deterministic math,',
    line2: 'human-grade answers',
    description:
      'Copilots grounded in your data boundary—audit-friendly, fast, and never generic.',
  },
  {
    id: 'risk-surface',
    type: 'image',
    image: {
      light:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2400&q=85',
      dark: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2400&q=85',
    },
    badge: 'Risk & compliance',
    line1: 'Stress paths',
    line2: 'you can defend',
    description:
      'Exposure maps and scenario exports that satisfy ops and regulators without leaving the workflow.',
  },
] as const;

const AUTO_MS = 8500;

function slideMediaUrl(slide: HeroSlide, theme: ThemeMode): string {
  if (slide.type === 'video') {
    return theme === 'dark' ? slide.poster.dark : slide.poster.light;
  }
  return theme === 'dark' ? slide.image.dark : slide.image.light;
}

function SlideMedia({
  slide,
  isActive,
  theme,
}: {
  slide: HeroSlide;
  isActive: boolean;
  theme: ThemeMode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const posterUrl = slideMediaUrl(slide, theme);

  useEffect(() => {
    setVideoFailed(false);
  }, [theme]);

  useEffect(() => {
    if (slide.type !== 'video' || !isActive || videoFailed) return;
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    const p = el.play();
    if (p) {
      p.catch(() => setVideoFailed(true));
    }
  }, [isActive, slide.type, videoFailed]);

  useEffect(() => {
    if (slide.type !== 'video' || isActive) return;
    videoRef.current?.pause();
  }, [isActive, slide.type]);

  if (slide.type === 'image') {
    return (
      <div
        key={`${slide.id}-${theme}`}
        className={[
          'absolute inset-0 bg-cover bg-center',
          isActive ? 'hero-ken-burns' : '',
        ].join(' ')}
        style={{ backgroundImage: `url(${posterUrl})` }}
        aria-hidden
      />
    );
  }

  if (videoFailed) {
    return (
      <div
        key={`${slide.id}-fallback-${theme}`}
        className={['absolute inset-0 bg-cover bg-center', isActive ? 'hero-ken-burns' : ''].join(' ')}
        style={{ backgroundImage: `url(${posterUrl})` }}
        aria-hidden
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      src={isActive ? slide.src : undefined}
      poster={posterUrl}
      muted
      playsInline
      loop
      preload="metadata"
      aria-hidden
      onError={() => setVideoFailed(true)}
    />
  );
}

export interface HeroCarouselProps {
  onEnquire: () => void;
  explorePlatformTo: string;
  explorePlatformState?: { from?: string };
}

export function HeroCarousel({ onEnquire, explorePlatformTo, explorePlatformState }: HeroCarouselProps) {
  const theme = useAppSelector((s) => s.ui.theme);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const paused = hovering;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion]);

  const go = useCallback((dir: -1 | 1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  }, []);

  const select = useCallback((i: number) => setIndex(i), []);

  return (
    <section
      className="relative min-h-svh overflow-hidden pt-20 pb-24 sm:pt-24"
      aria-roledescription="carousel"
      aria-label="Hero highlights"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={[
          'hero-carousel-track flex min-h-[calc(100svh-5rem)] transition-transform duration-[1100ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] sm:min-h-[calc(100svh-6rem)]',
          reduceMotion ? '!transition-none' : '',
        ].join(' ')}
        style={{
          width: `${SLIDES.length * 100}vw`,
          transform: `translateX(-${index * 100}vw)`,
        }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="relative min-h-[calc(100svh-5rem)] w-screen shrink-0 sm:min-h-[calc(100svh-6rem)]"
            aria-hidden={i !== index}
          >
            <SlideMedia slide={slide} isActive={i === index} theme={theme} />

            <div
              className="absolute inset-0 bg-gradient-to-b from-charcoal/88 via-charcoal/78 to-charcoal"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-charcoal/60 via-transparent to-charcoal/50"
              aria-hidden
            />

            <div className="relative z-10 flex min-h-[calc(100svh-5rem)] items-center justify-center px-6 sm:min-h-[calc(100svh-6rem)]">
              <div className="mx-auto max-w-5xl text-center text-white">
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-steel" strokeWidth={1.25} />
                  {slide.badge}
                </p>
                <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[4rem] lg:leading-[1.05]">
                  {slide.line1}
                  <span className="block bg-gradient-to-r from-white via-white to-white/75 bg-clip-text text-transparent">
                    {slide.line2}
                  </span>
                </h1>
                <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl md:leading-relaxed">
                  {slide.description}
                </p>
                <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
                  <button
                    type="button"
                    onClick={onEnquire}
                    className="group rounded-full bg-steel px-10 py-4 text-sm font-semibold tracking-wide text-white shadow-lg shadow-steel/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(86,140,163,0.55)] active:scale-[0.98]"
                  >
                    Enquire Now
                  </button>
                  <Link
                    to={explorePlatformTo}
                    state={explorePlatformState}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
                  >
                    Explore platform
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.25}
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-4 px-4 sm:bottom-10">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-navy/10 bg-white/85 px-2 py-2 backdrop-blur-md dark:border-white/10 dark:bg-black/25"
          role="tablist"
          aria-label="Choose hero slide"
        >
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy/90 transition-colors hover:bg-navy/10 hover:text-navy dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Previous slide"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${s.line1} ${s.line2}`}
              className={[
                'h-2 rounded-full transition-all duration-300',
                i === index
                  ? 'w-8 bg-steel'
                  : 'bg-navy/25 hover:bg-navy/40 dark:bg-white/35 dark:hover:bg-white/55',
              ].join(' ')}
              onClick={() => select(i)}
            />
          ))}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy/90 transition-colors hover:bg-navy/10 hover:text-navy dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Next slide"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {!reduceMotion ? (
          <div className="h-0.5 w-48 overflow-hidden rounded-full bg-navy/10 sm:w-64 dark:bg-white/15">
            <div
              key={index}
              className="h-full origin-left rounded-full bg-steel/90 animate-hero-progress"
              style={
                {
                  '--hero-progress-ms': `${AUTO_MS}ms`,
                  animationPlayState: paused ? 'paused' : 'running',
                } as CSSProperties
              }
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
