"use client";

import { usePesuProfile } from "@/lib/hooks/use-pesu-profile";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Search } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { navItems } from "@/components/layout/nav-items";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { pageMotion } from "@/lib/motion";

export function DashboardShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const [commandOpen, setCommandOpen] = useState(false);
    const { user, ready, logout } = useLocalAuth({ redirectIfMissing: true });
    const { profile } = usePesuProfile();

    const displayName = profile?.name ?? user?.name ?? user?.srn ?? "Student";
    const displaySrn = profile?.srn ?? user?.srn ?? "";
    const photoDataUrl = profile?.photoDataUrl ?? undefined;
    const displayProfileMeta = [
        profile?.branch,
        profile?.semester,
        profile?.section ? `Sec ${profile.section}` : "",
    ]
        .filter(Boolean)
        .join(" • ");

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setCommandOpen(true);
            }

            if (event.key === "Escape") {
                setCommandOpen(false);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    if (!ready || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#02020a] text-white">
                <div className="rounded-[2rem] bg-white/[0.06] px-6 py-5 text-center backdrop-blur-2xl">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#b7a8ff]" />

                    <p className="text-sm font-black text-slate-300">
                        Checking local session
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#050814] text-white">
            <ShellBackground />

            <AppSidebar
                pathname={pathname}
                displayName={displayName}
                displaySrn={displaySrn}
                displayProfileMeta={displayProfileMeta}
                photoDataUrl={photoDataUrl}
                profileConnected={Boolean(profile)}
                logout={logout}
            />

            <div className="relative z-10 lg:pl-20">
                <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050814]/72 px-4 py-4 backdrop-blur-2xl sm:px-6">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                        <div className="min-w-0">
                            <motion.h1
                                key={title}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.28,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="truncate text-2xl font-black tracking-tight sm:text-3xl"
                            >
                                {title}
                            </motion.h1>

                            {subtitle && (
                                <motion.p
                                    key={subtitle}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        delay: 0.04,
                                        duration: 0.28,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="mt-1 truncate text-sm text-slate-500"
                                >
                                    {subtitle}
                                </motion.p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setCommandOpen(true)}
                                className="group relative hidden overflow-hidden rounded-[1.35rem] border border-white/[0.09] bg-white/[0.045] px-4 py-3 text-sm font-bold text-slate-400 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.075] hover:text-white md:flex md:items-center md:gap-3"
                            >
                                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#795be6]/20 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100" />

                                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.055] text-[#b7a8ff]">
                                    <Search size={15} />
                                </span>

                                <span className="relative z-10">Search</span>

                                <span className="relative z-10 rounded-xl border border-white/[0.08] bg-white/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 transition group-hover:text-slate-300">
                                    Ctrl K
                                </span>
                            </button>

                            <button
                                onClick={() => setCommandOpen(true)}
                                className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] text-slate-400 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-300 hover:border-white/[0.16] hover:bg-white/[0.075] hover:text-white md:hidden"
                            >
                                <div className="absolute inset-0 bg-[#795be6]/15 opacity-0 blur-xl transition group-hover:opacity-100" />
                                <Search size={17} className="relative z-10" />
                            </button>
                        </div>
                    </div>
                </header>

                <motion.main
                    key={pathname}
                    variants={pageMotion}
                    initial="initial"
                    animate="animate"
                    className="px-4 py-6 pb-28 sm:px-6 lg:pb-8"
                >
                    {children}
                </motion.main>
            </div>

            <MobileNav
                pathname={pathname}
                logout={logout}
                srn={displaySrn || displayName}
                photoDataUrl={photoDataUrl}
            />

            <AnimatePresence>
                {commandOpen && (
                    <CommandPalette
                        pathname={pathname}
                        onClose={() => setCommandOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function MobileNav({
    pathname,
    srn,
    logout,
    photoDataUrl,
}: {
    pathname: string;
    srn: string;
    logout: () => void;
    photoDataUrl?: string;
}) {
    const mobileItems = navItems.slice(0, 5);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
            <div className="mb-2 flex items-center justify-between rounded-[1.4rem] border border-white/[0.08] bg-[#050814]/82 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="flex min-w-0 items-center gap-2">
                    <ProfileAvatar
                        name={srn}
                        photoDataUrl={photoDataUrl}
                        compact
                    />

                    <span className="truncate text-xs font-black text-slate-300">
                        {srn}
                    </span>
                </div>

                <button
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-950"
                >
                    <LogOut size={13} />
                    Logout
                </button>
            </div>

            <nav className="rounded-[1.7rem] border border-white/[0.08] bg-[#050814]/82 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <div className="grid grid-cols-5 gap-1">
                    {mobileItems.map((item) => {
                        const active =
                            pathname === item.href || pathname.startsWith(`${item.href}/`);

                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-black transition ${active
                                    ? "bg-white text-slate-950"
                                    : "text-slate-500 hover:bg-white/[0.06] hover:text-white"
                                    }`}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="mobile-active-pill"
                                        className="absolute inset-0 rounded-2xl bg-white"
                                        transition={{
                                            type: "spring",
                                            stiffness: 420,
                                            damping: 34,
                                        }}
                                    />
                                )}

                                <span className="relative z-10 flex flex-col items-center">
                                    <Icon size={17} />
                                    <span className="mt-1 truncate">{item.label}</span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

function ShellBackground() {
    return (
        <div className="pointer-events-none fixed inset-0">
            <div className="absolute inset-0 bg-[#050814]" />
            <div className="absolute left-[-18rem] top-[-16rem] h-[34rem] w-[34rem] rounded-full bg-sky-400/[0.11] blur-3xl" />
            <div className="absolute right-[-20rem] top-[20%] h-[38rem] w-[38rem] rounded-full bg-blue-500/[0.09] blur-3xl" />
            <div className="absolute bottom-[-20rem] left-[35%] h-[36rem] w-[36rem] rounded-full bg-violet-500/[0.08] blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050814_78%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>
    );
}
