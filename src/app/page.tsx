"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { clearPesuSyncCache } from "@/lib/pesu/campusflow-pesu";
import { notifyPesuSyncChanged } from "@/lib/hooks/use-pesu-attendance";
import BorderGlow from "@/components/ui/BorderGlow";
import {
  clearLocalUser,
  createLocalUser,
  saveLocalUser,
} from "@/lib/auth/local-session";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";

type SwapCard = {
  index: string;
  label: string;
  href: string;
  eyebrow: string;
  rotatingTexts: string[];
  description: string;
  metric: string;
  detail: string;
  icon: LucideIcon;
  tone: "purple" | "red" | "blue";
};

type PesuLoginResponse = {
  connected?: boolean;
  srn?: string;
  message?: string;
};

const swapCards: SwapCard[] = [
  {
    index: "01",
    label: "Attendance",
    href: "/attendance",
    eyebrow: "Risk Scanner",
    rotatingTexts: [
      "Subject-wise attendance",
      "Skip buffer prediction",
      "Recovery plan ready",
    ],
    description: "Track attendance, target safety, low subjects, and recovery.",
    metric: "75%",
    detail: "Target protected",
    icon: BarChart3,
    tone: "red",
  },
  {
    index: "02",
    label: "Results",
    href: "/results",
    eyebrow: "Performance Vault",
    rotatingTexts: ["Marks overview", "Grade trend tracking", "SGPA preview"],
    description: "Check marks, grades, SGPA trends, and exam performance.",
    metric: "8.7",
    detail: "SGPA preview",
    icon: GraduationCap,
    tone: "purple",
  },
  {
    index: "03",
    label: "Timetable",
    href: "/timetable",
    eyebrow: "Weekly Map",
    rotatingTexts: ["Upcoming classes", "Rooms and faculty", "Academic flow"],
    description: "See class slots, rooms, faculty, and your weekly rhythm.",
    metric: "09:00",
    detail: "Next class",
    icon: CalendarDays,
    tone: "blue",
  },
];

export default function HomePage() {
  const router = useRouter();
  const authPanelRef = useRef<HTMLDivElement | null>(null);

  const { user } = useLocalAuth();
  const [loginError, setLoginError] = useState("");
  const [srn, setSrn] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [loginLoading, setLoginLoading] = useState(false);

  const authReady = true;

  function pulseLoginCard() {
    authPanelRef.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.018)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      }
    );
  }

  async function handleServerLogin() {
    if (!srn.trim() || !password.trim()) return;

    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/pesu/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          srn: srn.trim().toUpperCase(),
          password,
        }),
      });

      const data = (await response.json()) as PesuLoginResponse;

      if (!response.ok || !data.connected) {
        throw new Error(data.message || "Could not login with PESU Academy.");
      }

      const localUser = createLocalUser({
        srn: data.srn ?? srn,
      });

      saveLocalUser(localUser);
      clearPesuSyncCache();
      notifyPesuSyncChanged();

      setPassword("");

      router.push(nextPath);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not login with PESU Academy.";

      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/pesu/logout", {
        method: "POST",
      });
    } catch {
      // Local cleanup still completes if the server session is already gone.
    }

    clearLocalUser();
    clearPesuSyncCache();
    notifyPesuSyncChanged();

    setSrn("");
    setPassword("");
    setLoginError("");
    setNextPath("/dashboard");
    setLoginLoading(false);
  }

  function handleCardOpen(href: string) {
    if (user) {
      router.push(href);
      return;
    }

    setNextPath(href);
    pulseLoginCard();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02020a] text-white">
      <HomeStyles />
      <OrbBackground />

      <section className="relative z-10 min-h-screen px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(410px,0.92fr)]">
          <section className="relative flex min-h-[640px] flex-col justify-center">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#b7a8ff]">
                Academic OS
              </p>

              <BrandTypewriter
                text="CampusFlow"
                className="mt-4 min-h-[5rem] text-6xl font-black leading-[0.82] tracking-[-0.08em] text-white sm:text-7xl xl:min-h-[6.5rem] xl:text-8xl"
              />

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                Your local-first academic workspace for attendance, results,
                and timetable — built with a premium card-swap dashboard feel.
              </p>
            </div>

            <div className="mt-12">
              <CardSwap
                cards={swapCards}
                onOpen={handleCardOpen}
                locked={!user}
              />
            </div>
          </section>

          <section className="flex items-center justify-center lg:justify-end">
            <div ref={authPanelRef} className="w-full max-w-md">
              <BorderGlow
                edgeSensitivity={30}
                glowColor="40 80 80"
                backgroundColor="rgba(18, 15, 23, 0.78)"
                borderRadius={28}
                glowRadius={40}
                glowIntensity={1}
                coneSpread={25}
                animated={false}
                colors={["#c084fc", "#f472b6", "#38bdf8"]}
                fillOpacity={0.45}
              >
                <div className="login-panel relative rounded-[2rem] p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <LoginLogo />

                    <div>
                      <p className="text-lg font-black tracking-tight">
                        CampusFlow
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Server Login
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#795be6]/15 px-3 py-1.5 text-xs font-black text-[#ded7ff]">
                      <ShieldCheck size={14} />
                      Server-side PESU access
                    </div>

                    <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em]">
                      Connect with
                      <span className="block text-slate-500">PESU.</span>
                    </h2>

                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      Your SRN is saved locally for routing, while the PESU
                      session stays server-side.
                    </p>
                  </div>

                  <div className="mt-7 grid gap-3">
                    {!authReady && (
                      <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        Checking local session
                      </div>
                    )}

                    {authReady && user && (
                      <div className="rounded-2xl bg-emerald-300/10 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />

                          <div>
                            <p className="text-sm font-black text-emerald-100">
                              Server session active
                            </p>

                            <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                              {user.name && user.name !== user.srn
                                ? user.name
                                : `SRN: ${user.srn}`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => router.push(nextPath)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff]"
                        >
                          Continue
                          <ArrowUpRight size={16} />
                        </button>

                        <button
                          onClick={handleLogout}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.075] hover:text-white"
                        >
                          Clear session
                          <LogOut size={16} />
                        </button>
                      </div>
                    )}

                    {authReady && !user && (
                      <>
                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            SRN
                          </span>

                          <input
                            value={srn}
                            onChange={(event) => setSrn(event.target.value)}
                            placeholder="PES1UG25CS000"
                            className="rounded-2xl bg-white/[0.045] px-4 py-3 text-sm font-bold uppercase text-white outline-none transition placeholder:normal-case placeholder:text-slate-600 focus:bg-white/[0.065]"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            Password
                          </span>

                          <input
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            type="password"
                            placeholder="Enter password"
                            className="rounded-2xl bg-white/[0.045] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:bg-white/[0.065]"
                          />
                        </label>
                        {loginError && (
                          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-bold leading-6 text-red-100">
                            {loginError}
                          </div>
                        )}
                        <button
                          onClick={handleServerLogin}
                          disabled={
                            loginLoading || !srn.trim() || !password.trim()
                          }
                          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loginLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <LogIn size={18} />
                          )}
                          Login securely
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-3">
                    <MiniStat label="Login" value="SRN" />
                    <MiniStat label="Session" value="Server" />
                    <MiniStat label="Pass" value="Hidden" />
                  </div>
                </div>
              </BorderGlow>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function CardSwap({
  cards,
  onOpen,
  locked,
}: {
  cards: SwapCard[];
  onOpen: (href: string) => void;
  locked: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % cards.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [cards.length]);

  const orderedCards = cards.map((card, index) => {
    const position = (index - activeIndex + cards.length) % cards.length;
    return { ...card, position };
  });

  return (
    <div className="relative h-[440px] w-full max-w-[700px]">
      <div className="absolute left-0 top-0 z-50 flex items-center gap-3">
        {cards.map((card, index) => (
          <button
            key={card.href}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${index === activeIndex
              ? "w-10 bg-[#b7a8ff]"
              : "w-2.5 bg-white/20 hover:bg-white/40"
              }`}
            aria-label={`Show ${card.label}`}
          />
        ))}
      </div>

      <div className="absolute left-0 top-14 h-[370px] w-full">
        {orderedCards
          .sort((a, b) => b.position - a.position)
          .map((card) => (
            <SwapStackCard
              key={card.href}
              card={card}
              position={card.position}
              onOpen={() => onOpen(card.href)}
              locked={locked}
            />
          ))}
      </div>
    </div>
  );
}

function SwapStackCard({
  card,
  position,
  onOpen,
  locked,
}: {
  card: SwapCard;
  position: number;
  onOpen: () => void;
  locked: boolean;
}) {
  const Icon = card.icon;
  const tone = getCardTone(card.tone);

  const transforms = [
    {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      zIndex: 30,
    },
    {
      x: 36,
      y: 34,
      rotate: 4,
      scale: 0.94,
      opacity: 0.32,
      filter: "blur(8px)",
      zIndex: 20,
    },
    {
      x: 68,
      y: 68,
      rotate: 8,
      scale: 0.88,
      opacity: 0.14,
      filter: "blur(14px)",
      zIndex: 10,
    },
  ];

  const current = transforms[position] ?? transforms[2];
  const isActive = position === 0;

  return (
    <motion.button
      type="button"
      onClick={isActive ? onOpen : undefined}
      animate={{
        x: current.x,
        y: current.y,
        rotate: current.rotate,
        scale: current.scale,
        opacity: current.opacity,
        filter: current.filter,
      }}
      initial={false}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute left-0 top-0 w-[460px] rounded-[2rem] text-left ${isActive ? "cursor-pointer" : "pointer-events-none"
        }`}
      style={{ zIndex: current.zIndex }}
    >
      <div
        className={`swap-glass-card relative min-h-[350px] overflow-hidden rounded-[2rem] p-6 ${isActive ? "shadow-[0_34px_120px_rgba(0,0,0,0.42)]" : ""
          }`}
      >
        {isActive && (
          <div className="pointer-events-none absolute inset-0 z-[5] rounded-[2rem] bg-gradient-to-br from-white/[0.035] via-transparent to-black/20" />
        )}

        <div
          className={`absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl ${tone.glow}`}
        />
        <div
          className={`absolute -bottom-20 -left-20 h-52 w-52 rounded-full blur-3xl ${tone.softGlow}`}
        />

        <div className="relative z-10 flex items-start justify-between">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone.icon}`}
          >
            <Icon size={25} />
          </div>

          <div className="flex items-center gap-2">
            {locked && isActive && (
              <LockKeyhole size={14} className="text-slate-500" />
            )}

            <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-black text-slate-400">
              {card.index}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-12">
          <p
            className={`text-xs font-black uppercase tracking-[0.22em] ${tone.text}`}
          >
            {card.eyebrow}
          </p>

          <RotatingText
            words={card.rotatingTexts}
            className="mt-3 min-h-7 text-sm font-black uppercase tracking-[0.18em] text-white/70"
          />

          <h2 className="mt-3 text-5xl font-black leading-none tracking-[-0.06em] text-white">
            {card.label}
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
            {card.description}
          </p>
        </div>

        <div className="relative z-10 mt-8 flex items-end justify-between">
          <div>
            <p className="text-4xl font-black tracking-[-0.06em] text-white">
              {card.metric}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {card.detail}
            </p>
          </div>

          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
            <ArrowUpRight size={19} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function BrandTypewriter({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (visibleText.length < text.length) {
      const typingTimeout = window.setTimeout(() => {
        setVisibleText(text.slice(0, visibleText.length + 1));
      }, 75);

      return () => window.clearTimeout(typingTimeout);
    }

    const restartTimeout = window.setTimeout(() => {
      setVisibleText("");
    }, 7000);

    return () => window.clearTimeout(restartTimeout);
  }, [text, visibleText]);

  return (
    <h1 className={className} aria-label={text}>
      <span>{visibleText}</span>
      <span className="ml-1 inline-block animate-pulse text-[#b7a8ff]">|</span>
    </h1>
  );
}

function RotatingText({
  words,
  className = "",
}: {
  words: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((value) => (value + 1) % words.length);
    }, 1700);

    return () => window.clearInterval(interval);
  }, [words.length]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function LoginLogo() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 text-slate-950 shadow-lg shadow-white/10">
      {!failed ? (
        <Image
          src="/campusflow-logo.png"
          alt="CampusFlow"
          width={44}
          height={44}
          priority
          onError={() => setFailed(true)}
          className="h-full w-full rounded-xl object-cover"
        />
      ) : (
        <Sparkles size={24} />
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-3 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-300">{value}</p>
    </div>
  );
}

function OrbBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[#02020a]" />

      <div className="orb-field absolute inset-0">
        <div className="orb orb-main" />
        <div className="orb orb-secondary" />
        <div className="orb orb-soft" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,2,10,0.12)_36%,rgba(2,2,10,0.86)_88%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,2,10,0.18),transparent_36%,rgba(2,2,10,0.82))]" />
    </div>
  );
}

function getCardTone(tone: SwapCard["tone"]) {
  if (tone === "red") {
    return {
      icon: "bg-red-300/10 text-red-200",
      glow: "bg-red-400/30",
      softGlow: "bg-orange-300/14",
      text: "text-red-200",
    };
  }

  if (tone === "blue") {
    return {
      icon: "bg-sky-300/10 text-sky-200",
      glow: "bg-sky-400/30",
      softGlow: "bg-blue-400/14",
      text: "text-sky-200",
    };
  }

  return {
    icon: "bg-[#795be6]/15 text-[#d7ceff]",
    glow: "bg-[#795be6]/35",
    softGlow: "bg-violet-300/14",
    text: "text-[#d7ceff]",
  };
}

function HomeStyles() {
  return (
    <style jsx global>{`
      .orb-field {
        overflow: hidden;
      }

      .orb {
        position: absolute;
        border-radius: 9999px;
        filter: blur(50px);
        transform: translate3d(0, 0, 0);
        will-change: transform, opacity;
        mix-blend-mode: screen;
      }

      .orb-main {
        left: 14%;
        top: 14%;
        width: 620px;
        height: 620px;
        background:
          radial-gradient(
            circle at 35% 30%,
            rgba(255, 255, 255, 0.42),
            transparent 18%
          ),
          radial-gradient(
            circle at 50% 50%,
            rgba(121, 91, 230, 0.62),
            transparent 52%
          ),
          radial-gradient(
            circle at 70% 72%,
            rgba(56, 189, 248, 0.34),
            transparent 58%
          );
        opacity: 0.78;
        animation: orbPulse 8s ease-in-out infinite alternate;
      }

      .orb-secondary {
        right: -12rem;
        top: 10%;
        width: 520px;
        height: 520px;
        background:
          radial-gradient(
            circle at 45% 38%,
            rgba(125, 211, 252, 0.46),
            transparent 52%
          ),
          radial-gradient(
            circle at 60% 65%,
            rgba(121, 91, 230, 0.4),
            transparent 58%
          );
        opacity: 0.36;
        animation: orbFloatTwo 14s ease-in-out infinite alternate;
      }

      .orb-soft {
        left: -10rem;
        bottom: -12rem;
        width: 580px;
        height: 580px;
        background:
          radial-gradient(circle, rgba(121, 91, 230, 0.36), transparent 58%),
          radial-gradient(
            circle at 70% 30%,
            rgba(255, 255, 255, 0.18),
            transparent 38%
          );
        opacity: 0.34;
        animation: orbFloatThree 16s ease-in-out infinite alternate;
      }

      @keyframes orbPulse {
        from {
          transform: scale(0.95) rotate(0deg);
        }

        to {
          transform: scale(1.08) rotate(8deg);
        }
      }

      @keyframes orbFloatTwo {
        from {
          transform: translate3d(0, 0, 0) scale(1);
        }

        to {
          transform: translate3d(-4rem, 3rem, 0) scale(1.08);
        }
      }

      @keyframes orbFloatThree {
        from {
          transform: translate3d(0, 0, 0) scale(1);
        }

        to {
          transform: translate3d(5rem, -3rem, 0) scale(1.06);
        }
      }

      .swap-glass-card,
      .login-panel {
        position: relative;
        background:
          radial-gradient(
            circle at 30% 0%,
            rgba(255, 255, 255, 0.12),
            transparent 34%
          ),
          rgba(255, 255, 255, 0.068);
        box-shadow:
          inset 0 1px 1px rgba(255, 255, 255, 0.16),
          0 26px 100px rgba(0, 0, 0, 0.36);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
      }

      .swap-glass-card::before,
      .login-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.34),
          rgba(255, 255, 255, 0.1) 32%,
          rgba(255, 255, 255, 0) 55%,
          rgba(255, 255, 255, 0.13)
        );
        -webkit-mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }
    `}</style>
  );
}
