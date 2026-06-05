"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut } from "lucide-react";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

import { ProfileAvatar } from "@/components/layout/ProfileAvatar";
import { navItems } from "@/components/layout/nav-items";
import type { NavItem } from "@/components/layout/nav-items";

const SIDEBAR_EXPANDED_STORAGE_KEY = "campusflow:sidebar-expanded";

const sidebarLayoutTransition = {
    type: "tween",
    duration: 0.62,
    ease: [0.32, 0.72, 0, 1],
} as const;

const sidebarMotionClass =
    "transition-all duration-[620ms] ease-[cubic-bezier(0.32,0.72,0,1)]";
const sidebarTextMotionClass =
    "transition-all duration-[620ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

let rememberedSidebarExpanded = false;
const sidebarListeners = new Set<() => void>();

function getSidebarExpandedServerSnapshot() {
    return rememberedSidebarExpanded;
}

function getSidebarExpandedSnapshot() {
    if (typeof window === "undefined") {
        return rememberedSidebarExpanded;
    }

    try {
        const storedExpanded = window.sessionStorage.getItem(
            SIDEBAR_EXPANDED_STORAGE_KEY
        );

        if (storedExpanded !== null) {
            rememberedSidebarExpanded = storedExpanded === "true";
        }
    } catch {
        // Ignore unavailable session storage.
    }

    return rememberedSidebarExpanded;
}

function subscribeSidebarExpanded(listener: () => void) {
    sidebarListeners.add(listener);

    return () => sidebarListeners.delete(listener);
}

function persistSidebarExpanded(expanded: boolean) {
    rememberedSidebarExpanded = expanded;

    try {
        window.sessionStorage.setItem(
            SIDEBAR_EXPANDED_STORAGE_KEY,
            expanded ? "true" : "false"
        );
    } catch {
        // Session storage is a convenience, not a rendering dependency.
    }

    sidebarListeners.forEach((listener) => listener());
}

export function AppSidebar({
    pathname,
    displayName,
    displaySrn,
    displayProfileMeta,
    photoDataUrl,
    profileConnected,
    logout,
}: {
    pathname: string;
    displayName: string;
    displaySrn: string;
    displayProfileMeta: string;
    photoDataUrl?: string;
    profileConnected: boolean;
    logout: () => void;
}) {
    const sidebarRef = useRef<HTMLElement | null>(null);
    const sidebarIntentTimerRef = useRef<number | null>(null);

    const sidebarExpanded = useSyncExternalStore(
        subscribeSidebarExpanded,
        getSidebarExpandedSnapshot,
        getSidebarExpandedServerSnapshot
    );

    const profileLabel = displaySrn ? `${displayName} ${displaySrn}` : displayName;

    const setSidebarExpanded = useCallback((expanded: boolean) => {
        persistSidebarExpanded(expanded);
    }, []);

    const clearSidebarIntent = useCallback(() => {
        if (sidebarIntentTimerRef.current === null) return;

        window.clearTimeout(sidebarIntentTimerRef.current);
        sidebarIntentTimerRef.current = null;
    }, []);

    const scheduleSidebarExpanded = useCallback(
        (expanded: boolean, delay = 0) => {
            clearSidebarIntent();

            if (delay <= 0) {
                setSidebarExpanded(expanded);
                return;
            }

            sidebarIntentTimerRef.current = window.setTimeout(() => {
                setSidebarExpanded(expanded);
                sidebarIntentTimerRef.current = null;
            }, delay);
        },
        [clearSidebarIntent, setSidebarExpanded]
    );

    useEffect(() => clearSidebarIntent, [clearSidebarIntent]);

    useEffect(() => {
        if (!sidebarExpanded) return;

        function handlePointerMove(event: PointerEvent) {
            const sidebar = sidebarRef.current;
            if (!sidebar) return;

            const rect = sidebar.getBoundingClientRect();

            const pointerInside =
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom;

            if (!pointerInside) {
                scheduleSidebarExpanded(false, 80);
            } else {
                clearSidebarIntent();
            }
        }

        window.addEventListener("pointermove", handlePointerMove);

        return () => window.removeEventListener("pointermove", handlePointerMove);
    }, [clearSidebarIntent, scheduleSidebarExpanded, sidebarExpanded]);

    return (
        <aside
            ref={sidebarRef}
            onMouseEnter={() => scheduleSidebarExpanded(true)}
            onMouseLeave={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();

                const pointerInside =
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom;

                if (!pointerInside) {
                    scheduleSidebarExpanded(false, 80);
                }
            }}
            className={`fixed left-0 top-0 z-40 hidden h-screen overflow-visible bg-transparent px-3 py-5 shadow-none backdrop-blur-none transition-[width] duration-[620ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] lg:block ${sidebarExpanded ? "w-72" : "w-20"
                }`}
        >
            <div
                className={`pointer-events-none absolute rounded-[1.8rem] border border-white/[0.08] bg-[#050814]/58 shadow-[18px_0_70px_rgba(0,0,0,0.24)] backdrop-blur-[28px] backdrop-saturate-150 ${sidebarMotionClass} will-change-transform ${sidebarExpanded
                        ? "left-3 right-3 top-4 bottom-4 bg-[#050814]/78"
                        : "left-1/2 top-1/2 h-[36rem] w-14 -translate-x-1/2 -translate-y-1/2 bg-[#050814]/52"
                    }`}
            />

            <div
                className={`pointer-events-none absolute rounded-[1.8rem] bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-white/[0.04] ${sidebarMotionClass} will-change-transform ${sidebarExpanded
                        ? "left-3 right-3 top-4 bottom-4"
                        : "left-1/2 top-1/2 h-[36rem] w-14 -translate-x-1/2 -translate-y-1/2"
                    }`}
            />

            <div
                className={`pointer-events-none absolute w-px bg-gradient-to-b from-transparent via-white/20 to-transparent ${sidebarMotionClass} will-change-transform ${sidebarExpanded
                        ? "right-3 top-8 bottom-8"
                        : "left-1/2 top-1/2 h-[32rem] translate-x-7 -translate-y-1/2"
                    }`}
            />

            <div className="relative h-full">
                <motion.div
                    layout
                    transition={sidebarLayoutTransition}
                    className={`absolute ${sidebarMotionClass} will-change-transform ${sidebarExpanded
                            ? "left-0 top-0 w-full translate-x-0"
                            : "left-1/2 top-[calc(50%-16.25rem)] w-12 -translate-x-1/2"
                        }`}
                >
                    <Link
                        href="/dashboard"
                        aria-label="CampusFlow dashboard"
                        onClick={() => setSidebarExpanded(true)}
                        className={`group flex items-center overflow-hidden rounded-2xl ${sidebarMotionClass} ${sidebarExpanded
                                ? "w-full justify-start px-3"
                                : "h-12 w-12 justify-center px-0"
                            }`}
                    >
                        <SidebarLogo />

                        <div
                            className={`overflow-hidden whitespace-nowrap ${sidebarTextMotionClass} ${sidebarExpanded
                                    ? "ml-3 max-w-44 translate-x-0 opacity-100"
                                    : "pointer-events-none ml-0 max-w-0 translate-x-0 opacity-0"
                                }`}
                        >
                            <h1 className="text-base font-black tracking-tight text-white">
                                CampusFlow
                            </h1>
                            <p className="text-xs font-medium text-slate-500">
                                Academic OS
                            </p>
                        </div>
                    </Link>
                </motion.div>

                <nav
                    className={`absolute left-0 right-0 flex flex-col ${sidebarMotionClass} ${sidebarExpanded
                            ? "top-[4.5rem] bottom-[8.75rem] w-full justify-center gap-1"
                            : "top-1/2 mx-auto w-12 -translate-y-1/2 gap-1.5"
                        }`}
                >
                    {navItems.map((item) => (
                        <SidebarLink
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            expanded={sidebarExpanded}
                            onNavigate={() => setSidebarExpanded(true)}
                        />
                    ))}
                </nav>

                <motion.div
                    layout
                    transition={sidebarLayoutTransition}
                    className={`absolute overflow-hidden rounded-[1.5rem] ${sidebarMotionClass} will-change-transform ${sidebarExpanded
                            ? "left-0 top-[calc(100%-8.75rem)] w-full translate-x-0 px-3 py-3"
                            : "left-1/2 top-[calc(50%+13.25rem)] w-14 -translate-x-1/2 px-0 py-0"
                        }`}
                    aria-label={`${profileLabel} profile`}
                >
                    <div
                        className={`flex items-center ${sidebarTextMotionClass} ${sidebarExpanded ? "justify-start" : "justify-center"
                            }`}
                    >
                        <ProfileAvatar
                            name={displayName}
                            photoDataUrl={photoDataUrl}
                            size="nav"
                        />

                        <div
                            className={`min-w-0 overflow-hidden whitespace-nowrap ${sidebarTextMotionClass} ${sidebarExpanded
                                    ? "pointer-events-auto ml-3 max-w-44 translate-x-0 opacity-100"
                                    : "pointer-events-none ml-0 max-w-0 translate-x-0 opacity-0"
                                }`}
                        >
                            <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                                {profileConnected ? "PESU Session" : "Local Session"}
                            </p>

                            <p className="mt-1 truncate text-sm font-black text-slate-300">
                                {displayName}
                            </p>

                            {displayProfileMeta && (
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                                    {displayProfileMeta}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className={`flex w-full translate-y-2 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-4 text-xs font-black text-slate-950 opacity-0 shadow-lg shadow-white/5 ${sidebarTextMotionClass} hover:bg-[#ded7ff] ${sidebarExpanded
                                ? "pointer-events-auto mt-4 max-h-20 translate-y-0 py-3 opacity-100"
                                : "pointer-events-none mt-0 max-h-0 py-0"
                            }`}
                    >
                        <LogOut size={15} />
                        Logout
                    </button>
                </motion.div>
            </div>
        </aside>
    );
}

function SidebarLogo() {
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[#b7a8ff] transition-colors duration-[620ms] ease-[cubic-bezier(0.32,0.72,0,1)]">
            {!failed ? (
                <Image
                    src="/campusflow-logo.png"
                    alt="CampusFlow"
                    width={44}
                    height={44}
                    onError={() => setFailed(true)}
                    className="h-full w-full object-cover"
                />
            ) : (
                <LayoutDashboard size={22} strokeWidth={2.4} />
            )}
        </div>
    );
}

function SidebarLink({
    item,
    pathname,
    expanded,
    onNavigate,
}: {
    item: NavItem;
    pathname: string;
    expanded: boolean;
    onNavigate: () => void;
}) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`group/nav relative flex items-center overflow-visible rounded-2xl text-sm font-bold ${sidebarMotionClass} ${expanded
                    ? "min-h-10 w-full justify-start gap-3 px-3 py-1"
                    : "mx-auto h-11 w-11 justify-center px-0 py-0"
                } ${active
                    ? expanded
                        ? "bg-white/[0.045] text-white"
                        : "text-sky-100"
                    : "text-slate-500 hover:bg-white/[0.025] hover:text-white"
                }`}
        >
            <span
                className={`relative z-10 flex shrink-0 items-center justify-center rounded-[1rem] ${sidebarMotionClass} ${expanded ? "h-8 w-8" : "h-9 w-9"
                    } ${active
                        ? "bg-sky-300/[0.12] text-sky-100 shadow-[0_0_24px_rgba(125,211,252,0.14)]"
                        : "text-slate-500 group-hover/nav:text-white"
                    }`}
            >
                {active && (
                    <motion.span
                        layoutId="sidebar-orbit-shell"
                        className="absolute inset-0 rounded-[1rem]"
                        transition={{
                            type: "tween",
                            duration: 0.62,
                            ease: [0.32, 0.72, 0, 1],
                        }}
                    >
                        <motion.span
                            key={pathname}
                            initial={{ rotate: -90 }}
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1.45,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                            className="absolute inset-0"
                        >
                            <span className="absolute left-1/2 top-[-3px] h-2 w-2 -translate-x-1/2 rounded-full bg-sky-200 shadow-lg shadow-sky-200/60" />
                        </motion.span>
                    </motion.span>
                )}

                <Icon size={expanded ? 17 : 18} strokeWidth={active ? 2.5 : 2.2} />
            </span>

            <span
                className={`relative z-10 overflow-hidden whitespace-nowrap leading-none ${sidebarTextMotionClass} ${expanded
                        ? "max-w-32 translate-x-0 opacity-100"
                        : "max-w-0 translate-x-0 opacity-0"
                    } ${active ? "text-white" : "text-slate-500 group-hover/nav:text-white"}`}
            >
                {item.label}
            </span>
        </Link>
    );
}
