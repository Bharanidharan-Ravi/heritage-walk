// src/Component/pages/NewPrototype.jsx
//
// PROTOTYPE ONLY — served at /new, outside the main <Layout/>.
// v2: pulled back from "immersive" gimmicks (marquee, spinning mandala,
// cursor glow) toward a sleeker, more restrained, modern-editorial look —
// tighter type scale, quieter motion, more whitespace, cleaner grid.
// Built from the existing brand tokens (navy #0b1720 / gold #FFD050,
// Playfair Display + Inter, existing /images assets). Single throwaway
// file until this direction is approved — not split into Section+Config,
// not linked from nav.

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const NAVY = "#0b1720";
const GOLD = "#FFD050";
const INK = "#0e1a22"; // slightly lifted panel tone against NAVY

// ---------------------------------------------------------------------------
// Reveal-on-scroll — quieter than v1 (shorter travel, no scale/spin tricks).
// ---------------------------------------------------------------------------
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 700ms ease ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
      }}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", label }) {
  const [ref, visible] = useReveal();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let raf;
    const start = performance.now();
    const dur = 1200;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to]);

  return (
    <div ref={ref}>
      <div className="font-serif text-4xl md:text-5xl font-semibold text-white">
        {n}
        {suffix}
      </div>
      <div className="mt-2 text-[11px] tracking-[0.2em] uppercase text-white/45 font-sans">
        {label}
      </div>
    </div>
  );
}

const TRAILS = [
  {
    n: "01",
    title: "The Golden Threshold",
    place: "Amritsar, Punjab",
    duration: "3.5 hrs · Sunrise",
    img: "/images/GoldenTemple.png",
  },
  {
    n: "02",
    title: "Stone & Silence",
    place: "Mahabalipuram, Tamil Nadu",
    duration: "4 hrs · Morning",
    img: "/images/hero-bg.png",
  },
  {
    n: "03",
    title: "The Fog Line",
    place: "Nilgiri Foothills",
    duration: "3 hrs · Early light",
    img: "/images/fog.png",
  },
];

const STORIES = [
  {
    quote:
      "I've walked this route a dozen times as a tourist. This was the first time I understood it.",
    who: "Meera K.",
    role: "Chennai",
  },
  {
    quote:
      "Our guide stopped mid-sentence to point out a mason's mark nobody else on earth would have noticed.",
    who: "Daniel R.",
    role: "Melbourne",
  },
  {
    quote:
      "Not a tour — a conversation with four hundred years, led by someone who's spent a lifetime listening.",
    who: "Priya S.",
    role: "Bengaluru",
  },
];

export default function NewPrototype() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="font-sans w-full overflow-x-hidden selection:bg-[#FFD050] selection:text-[#0b1720]"
      style={{ background: NAVY, color: "#fff" }}
    >
      {/* ---------------------------------------------------------------- */}
      {/* NAV                                                              */}
      {/* ---------------------------------------------------------------- */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0b1720]/85 backdrop-blur-lg border-b border-white/[0.06]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto h-18 px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/images/new.png"
              alt="Archaeo Trails"
              className="w-8 h-8 object-contain"
            />
            <span className="font-serif text-[15px] tracking-wide">
              Archaeo Trails
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-9 text-[13px] text-white/60">
            <span className="hover:text-white transition-colors cursor-pointer">
              Trails
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Stories
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              About
            </span>
            <Link
              to="/"
              className="text-white/40 hover:text-white transition-colors text-xs"
            >
              ← current site
            </Link>
            <button className="px-5 py-2.5 rounded-full bg-white text-[#0b1720] text-xs font-semibold hover:bg-[#FFD050] transition-colors">
              Book a Trail
            </button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* HERO — calm, editorial, no parallax gimmick                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative max-w-6xl mx-auto px-6 pt-40 pb-20 md:pt-52 md:pb-28">
        <Reveal>
          <div className="flex items-center gap-2 mb-7 text-xs text-white/45">
            <span className="w-6 h-px bg-[#FFD050]" />
            Small-group heritage walks · Tamil Nadu &amp; beyond
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="font-serif text-[2.6rem] leading-[1.08] md:text-[4.4rem] md:leading-[1.05] font-medium max-w-3xl">
            History, read by
            <br />
            people who <span className="italic text-[#FFD050]">dig</span> it.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-7 max-w-lg text-[15px] md:text-base text-white/55 leading-relaxed">
            Guided walks led by working archaeologists, capped at eight
            guests, through temples, ports and ruins the tour buses drive
            straight past.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button className="px-7 py-3.5 rounded-full bg-[#FFD050] text-[#0b1720] text-sm font-semibold hover:brightness-95 transition-all">
              Find a Trail
            </button>
            <button className="px-7 py-3.5 rounded-full border border-white/15 text-white text-sm font-medium hover:border-white/40 transition-colors">
              How it works
            </button>
          </div>
        </Reveal>
      </section>

      {/* Full-width but restrained hero image — one clean frame, not a
          scroll-linked parallax layer */}
      <Reveal delay={100} className="max-w-6xl mx-auto px-6">
        <div className="relative rounded-2xl overflow-hidden aspect-[16/8]">
          <img
            src="/images/GoldenTemple.png"
            alt="The Golden Temple at sunrise"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 flex items-center gap-2 text-xs bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD050]" />
            The Golden Threshold — Amritsar
          </div>
        </div>
      </Reveal>

      {/* ---------------------------------------------------------------- */}
      {/* LOGOS / TRUST STRIP                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 border-t border-b border-white/10 py-10">
            <Counter to={214} label="Walks led" />
            <Counter to={38} suffix="+" label="Sites documented" />
            <Counter to={4200} suffix="+" label="Walkers hosted" />
            <Counter to={12} label="Years in the field" />
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FEATURED TRAILS — clean 3-up grid                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-8 md:py-16">
        <Reveal className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-[#FFD050]">
              Featured
            </span>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-medium">
              Three trails worth the alarm clock
            </h2>
          </div>
          <button className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
            View all trails <span aria-hidden>→</span>
          </button>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {TRAILS.map((t, i) => (
            <Reveal key={t.title} delay={i * 90}>
              <div className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.07] hover:border-white/15 transition-colors">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={t.img}
                    alt={t.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 text-[11px] font-mono text-white/70 bg-black/40 backdrop-blur px-2 py-1 rounded-md">
                    {t.n}
                  </span>
                </div>
                <div className="p-5">
                  <span className="text-[11px] tracking-[0.15em] uppercase text-white/40">
                    {t.place}
                  </span>
                  <h3 className="mt-2 font-serif text-xl font-medium">
                    {t.title}
                  </h3>
                  <div className="mt-4 flex items-center justify-between text-xs text-white/45">
                    <span>{t.duration}</span>
                    <span className="text-[#FFD050] group-hover:translate-x-0.5 transition-transform">
                      Details →
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* WHY — quiet two-column, no motif animation                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-14 items-start">
        <Reveal>
          <span className="text-xs tracking-[0.2em] uppercase text-[#FFD050]">
            Why we walk
          </span>
          <h2 className="mt-4 font-serif text-3xl md:text-[2.6rem] leading-tight font-medium">
            Every carving is a sentence.
            <br />
            <span className="text-white/45">We teach you to read it.</span>
          </h2>
        </Reveal>
        <Reveal delay={100} className="space-y-6 text-[15px] text-white/55 leading-relaxed">
          <p>
            Founded by field archaeologists frustrated with plaques that say
            "16th century" and nothing else, ArchaeoTrails turns heritage
            sites back into the living, half-finished stories they actually
            are.
          </p>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <div className="font-serif text-lg text-white mb-1">
                Specialist-led
              </div>
              <p className="text-sm text-white/45">
                Every walk is led by someone who has excavated or published on
                the site.
              </p>
            </div>
            <div>
              <div className="font-serif text-lg text-white mb-1">
                Capped at eight
              </div>
              <p className="text-sm text-white/45">
                Small enough for questions, quiet enough for the place to
                speak.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STORIES — tab-style, one large quote instead of a 3-card wall    */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <Reveal className="mb-12">
          <span className="text-xs tracking-[0.2em] uppercase text-[#FFD050]">
            In their words
          </span>
        </Reveal>
        <Reveal delay={80}>
          <blockquote className="font-serif text-2xl md:text-4xl leading-snug font-medium max-w-3xl">
            "{STORIES[active].quote}"
          </blockquote>
          <div className="mt-8 flex items-center gap-6">
            <div>
              <div className="text-sm font-medium">{STORIES[active].who}</div>
              <div className="text-xs text-white/40">
                {STORIES[active].role}
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              {STORIES.map((s, i) => (
                <button
                  key={s.who}
                  onClick={() => setActive(i)}
                  aria-label={`Show story from ${s.who}`}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === active ? GOLD : "rgba(255,255,255,0.2)",
                    width: i === active ? 20 : 8,
                  }}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA — clean card, not a full-bleed image band                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 pb-24 md:pb-32">
        <Reveal>
          <div
            className="relative rounded-3xl overflow-hidden px-8 py-14 md:px-16 md:py-20 text-center"
            style={{ background: INK, border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: GOLD }}
            />
            <h2 className="relative font-serif text-3xl md:text-5xl font-medium max-w-xl mx-auto">
              The next walk fills faster than you'd think.
            </h2>
            <p className="relative mt-4 text-white/50 text-sm max-w-sm mx-auto">
              Eight seats per trail. New dates open on the first of every
              month.
            </p>
            <button className="relative mt-8 px-8 py-3.5 rounded-full bg-[#FFD050] text-[#0b1720] text-sm font-semibold hover:brightness-95 transition-all">
              Reserve Your Spot
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <span>
            © {new Date().getFullYear()} Archaeo Trails — Prototype view, not
            linked from main nav
          </span>
          <Link to="/" className="hover:text-white/60 transition-colors">
            ← Back to current site
          </Link>
        </div>
      </footer>
    </div>
  );
}
