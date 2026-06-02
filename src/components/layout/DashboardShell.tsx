"use client";

import { usePesuProfile } from "@/lib/hooks/use-pesu-profile";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
    Armchair,
    BarChart3,
    CalendarDays,
    Clock3,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Search,
    Settings as SettingsIcon,
    UserRound,
    X,
} from "lucide-react";

import {
    attendanceSubjects,
    exams,
} from "@/lib/demo-data";
import { normalizeSearch } from "@/lib/academic-utils";
import { PesuSyncBadge } from "@/components/layout/PesuSyncBadge";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { usePesuResults } from "@/lib/hooks/use-pesu-results";
import { usePesuTimetable } from "@/lib/hooks/use-pesu-timetable";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { pageMotion } from "@/lib/motion";

type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

const navItems: NavItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Today",
        href: "/today",
        icon: Clock3,
    },
    {
        label: "Timetable",
        href: "/timetable",
        icon: CalendarDays,
    },
    {
        label: "Attendance",
        href: "/attendance",
        icon: BarChart3,
    },
    {
        label: "Results",
        href: "/results",
        icon: GraduationCap,
    },
    {
        label: "Seating",
        href: "/seating",
        icon: Armchair,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
    },
];

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

            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/[0.07] bg-[#050814]/78 p-5 backdrop-blur-2xl lg:block">
                <div className="flex h-full flex-col">
                    <Link href="/dashboard" className="group flex items-center gap-3">
                        <SidebarLogo />

                        <div>
                            <h1 className="text-base font-black tracking-tight">
                                CampusFlow
                            </h1>
                            <p className="text-xs font-medium text-slate-500">Academic OS</p>
                        </div>
                    </Link>

                    <nav className="mt-9 space-y-2">
                        {navItems.map((item) => (
                            <SidebarLink key={item.href} item={item} pathname={pathname} />
                        ))}
                    </nav>

                    <div className="mt-auto rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <ProfileAvatar
                                name={displayName}
                                photoDataUrl={photoDataUrl}
                            />

                            <div className="min-w-0">
                                <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                                    {profile ? "PESU Session" : "Local Session"}
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
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
                        >
                            <LogOut size={15} />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            <div className="relative z-10 lg:pl-72">
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
                            <div className="hidden lg:block">
                                <PesuSyncBadge />
                            </div>

                            <button
                                onClick={() => setCommandOpen(true)}
                                className="group relative hidden overflow-hidden rounded-[1.35rem] border border-white/[0.09] bg-white/[0.045] px-4 py-3 text-sm font-bold text-slate-400 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.075] hover:text-white md:flex md:items-center md:gap-3"
                            >
                                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#795be6]/20 blur-2xl opacity-0 transition duration-300 group-hover:opacity-100" />

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

function SidebarLogo() {
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 text-slate-950 shadow-lg shadow-white/10 transition group-hover:scale-105">
            {!failed ? (
                <Image
                    src="/campusflow-logo.png"
                    alt="CampusFlow"
                    width={44}
                    height={44}
                    onError={() => setFailed(true)}
                    className="h-full w-full rounded-xl object-cover"
                />
            ) : (
                <LayoutDashboard size={22} strokeWidth={2.4} />
            )}
        </div>
    );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${active
                ? "border-white/[0.08] bg-white/[0.06] text-white"
                : "border-transparent text-slate-500 hover:border-white/[0.07] hover:bg-white/[0.04] hover:text-white"
                }`}
        >
            <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${active
                    ? "bg-sky-300/10 text-sky-200"
                    : "bg-white/[0.03] text-slate-500 group-hover:text-white"
                    }`}
            >
                {active && (
                    <motion.span
                        layoutId="sidebar-orbit-shell"
                        className="absolute inset-0 rounded-xl"
                        transition={{
                            type: "spring",
                            stiffness: 360,
                            damping: 34,
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
                            <span className="absolute left-1/2 top-[-4px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-sky-300 shadow-lg shadow-sky-300/50" />
                        </motion.span>
                    </motion.span>
                )}

                <Icon size={18} />
            </span>

            <span>{item.label}</span>
        </Link>
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

function CommandPalette({
    onClose,
    pathname,
}: {
    onClose: () => void;
    pathname: string;
}) {
    const router = useRouter();
    const { subjects: syncedSubjects } = usePesuAttendance();
    const { slots: timetableSlots, todaySlots } = usePesuTimetable();
    const { results: resultItems } = usePesuResults();

    const searchableAttendanceSubjects =
        syncedSubjects.length > 0 ? syncedSubjects : attendanceSubjects;

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const activeItemRef = useRef<HTMLDivElement | null>(null);

    const commandItems = useMemo(() => {
        const pageItems = navItems.map((item) => ({
            title: item.label,
            subtitle: item.href,
            href: item.href,
            icon: item.icon,
            group: "Pages",
            keywords: `${item.label} ${item.href}`,
        }));

        const subjectItems = searchableAttendanceSubjects.map((subject) => ({
            title: subject.name,
            subtitle: `${subject.code} • Attendance • ${subject.faculty ?? "Faculty not synced"
                }`,
            href: "/attendance",
            icon: BarChart3,
            group: "Subjects",
            keywords: `${subject.name} ${subject.code} ${subject.faculty ?? ""
                } attendance`,
        }));

        const todayItems = todaySlots.map((item) => ({
            title: item.subject,
            subtitle: `${item.time} • ${item.room} • Today`,
            href: "/today",
            icon: Clock3,
            group: "Today",
            keywords: `${item.subject} ${item.code} ${item.time} ${item.room} ${item.faculty}`,
        }));

        const timetableItems = timetableSlots.map((item) => ({
            title: item.subject,
            subtitle: `${item.day} • ${item.time} • ${item.room}`,
            href: "/timetable",
            icon: CalendarDays,
            group: "Timetable",
            keywords: `${item.subject} ${item.code} ${item.day} ${item.time} ${item.room} ${item.faculty}`,
        }));

        const resultSearchItems = resultItems.map((item) => ({
            title: item.subject,
            subtitle: `${item.code} • ${item.total}% • Grade ${item.grade}`,
            href: "/results",
            icon: FileText,
            group: "Results",
            keywords: `${item.subject} ${item.code} ${item.grade} result marks`,
        }));

        const seatingItems = exams.map((exam) => ({
            title: exam.subject,
            subtitle: `${exam.exam} • ${exam.room} • Seat ${exam.seat}`,
            href: "/seating",
            icon: Armchair,
            group: "Exam Seating",
            keywords: `${exam.subject} ${exam.code} ${exam.exam} ${exam.room} ${exam.seat} ${exam.block}`,
        }));

        return [
            ...pageItems,
            ...subjectItems,
            ...todayItems,
            ...timetableItems,
            ...resultSearchItems,
            ...seatingItems,
        ];
    }, [resultItems, searchableAttendanceSubjects, timetableSlots, todaySlots]);

    const filteredItems = useMemo(() => {
        const rawSearch = query.toLowerCase().trim();
        const normalizedSearch = normalizeSearch(query);

        if (!rawSearch) return commandItems.slice(0, 12);

        return commandItems
            .filter((item) => {
                const rawKeywords = item.keywords.toLowerCase();
                const normalizedKeywords = normalizeSearch(item.keywords);

                return (
                    rawKeywords.includes(rawSearch) ||
                    normalizedKeywords.includes(normalizedSearch)
                );
            })
            .slice(0, 18);
    }, [commandItems, query]);

    const groupedItems = useMemo(() => {
        const groups: {
            group: string;
            items: {
                item: (typeof filteredItems)[number];
                index: number;
            }[];
        }[] = [];

        filteredItems.forEach((item, index) => {
            const existingGroup = groups.find((group) => group.group === item.group);

            if (existingGroup) {
                existingGroup.items.push({ item, index });
                return;
            }

            groups.push({
                group: item.group,
                items: [{ item, index }],
            });
        });

        return groups;
    }, [filteredItems]);

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
        });
    }, [activeIndex, filteredItems.length]);

    function handleClose() {
        setQuery("");
        setActiveIndex(0);
        onClose();
    }

    function handleOpenItem(href: string) {
        handleClose();
        router.push(href);
    }

    function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex((current) =>
                Math.min(current + 1, filteredItems.length - 1)
            );
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex((current) => Math.max(current - 1, 0));
        }

        if (event.key === "Enter") {
            event.preventDefault();

            const selectedItem = filteredItems[activeIndex];

            if (selectedItem) {
                handleOpenItem(selectedItem.href);
            }
        }

        if (event.key === "Escape") {
            event.preventDefault();
            handleClose();
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 px-4 pt-20 backdrop-blur-md sm:pt-24"
        >
            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{
                    duration: 0.32,
                    ease: [0.16, 1, 0.3, 1],
                }}
                className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080d1d]/88 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            >
                <div className="relative border-b border-white/[0.08]">
                    <div className="absolute left-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-sky-300/10 blur-2xl" />

                    <div className="relative flex items-center gap-3 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-slate-400">
                            <Search size={18} />
                        </div>

                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActiveIndex(0);
                            }}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Search pages, subjects, rooms, marks, exams..."
                            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-600"
                        />

                        <button
                            onClick={handleClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.1] hover:text-white"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-3">
                    {filteredItems.length > 0 ? (
                        <div className="space-y-5">
                            {groupedItems.map((group) => (
                                <div key={group.group}>
                                    <div className="mb-2 px-2">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                                            {group.group}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        {group.items.map(({ item, index }) => {
                                            const currentPage =
                                                pathname === item.href ||
                                                pathname.startsWith(`${item.href}/`);

                                            const keyboardActive = index === activeIndex;

                                            const Icon = item.icon;

                                            return (
                                                <motion.div
                                                    key={`${item.group}-${item.title}-${index}`}
                                                    ref={keyboardActive ? activeItemRef : undefined}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        delay: index * 0.018,
                                                        duration: 0.22,
                                                    }}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        onClick={handleClose}
                                                        className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition duration-300 ${keyboardActive || currentPage
                                                            ? "bg-white text-slate-950 shadow-lg shadow-white/10"
                                                            : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                                                            }`}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-3">
                                                            <span
                                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${keyboardActive || currentPage
                                                                    ? "border-slate-950/10 bg-slate-950/5"
                                                                    : "border-white/[0.08] bg-white/[0.045] group-hover:bg-white/[0.07]"
                                                                    }`}
                                                            >
                                                                <Icon size={18} />
                                                            </span>

                                                            <span className="min-w-0">
                                                                <span className="block truncate text-sm font-black">
                                                                    {item.title}
                                                                </span>

                                                                <span
                                                                    className={`mt-1 block truncate text-xs ${keyboardActive || currentPage
                                                                        ? "text-slate-600"
                                                                        : "text-slate-500"
                                                                        }`}
                                                                >
                                                                    {item.subtitle}
                                                                </span>
                                                            </span>
                                                        </span>

                                                        <span
                                                            className={`ml-4 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${keyboardActive || currentPage
                                                                ? "border-slate-950/10 bg-slate-950/5 text-slate-600"
                                                                : "border-white/[0.08] bg-white/[0.045] text-slate-600"
                                                                }`}
                                                        >
                                                            ↵
                                                        </span>
                                                    </Link>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-14 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-slate-500">
                                <Search size={22} />
                            </div>

                            <p className="text-sm font-black text-slate-300">
                                No result found
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                Try Data Structures, A-312, ISA-2, Attendance, Results, or a
                                subject code.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 border-t border-white/[0.08] px-5 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>↑ ↓ Navigate</span>
                    <span>Enter Open • Esc Close • Ctrl K Search</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
function ProfileAvatar({
    name,
    photoDataUrl,
    compact = false,
}: {
    name: string;
    photoDataUrl?: string;
    compact?: boolean;
}) {
    const [previewOpen, setPreviewOpen] = useState(false);

    const sizeClass = compact
        ? "h-7 w-7 rounded-xl"
        : "h-14 w-14 rounded-[1.25rem]";

    const fallbackText = name?.trim()?.slice(0, 1)?.toUpperCase() || "S";

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    if (photoDataUrl && !compact) {
                        setPreviewOpen(true);
                    }
                }}
                className={`group relative flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.06] text-[#b7a8ff] ring-1 ring-white/[0.08] transition duration-300 hover:scale-105 hover:ring-white/[0.18] ${sizeClass}`}
            >
                {photoDataUrl ? (
                    <Image
                        src={photoDataUrl}
                        alt={name}
                        fill
                        unoptimized
                        sizes="56px"
                        loading="eager"
                        className="h-full w-full object-cover object-top brightness-[1.03] contrast-[1.06] saturate-[1.08]"
                        style={{
                            imageRendering: "auto",
                        }}
                    />
                ) : compact ? (
                    <UserRound size={15} />
                ) : (
                    <span className="text-base font-black">{fallbackText}</span>
                )}

                {!compact && photoDataUrl && (
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/20 opacity-0 transition group-hover:opacity-100" />
                )}

                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-[#050814] bg-emerald-400 shadow-lg shadow-emerald-400/40" />
            </button>

            {previewOpen && photoDataUrl && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md">
                    <button
                        className="absolute inset-0"
                        onClick={() => setPreviewOpen(false)}
                        aria-label="Close profile photo preview"
                    />

                    <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#050814] p-3 shadow-2xl shadow-black">
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xl transition hover:bg-white hover:text-slate-950"
                            aria-label="Close preview"
                        >
                            <X size={16} />
                        </button>

                        <Image
                            src={photoDataUrl}
                            alt={name}
                            width={720}
                            height={960}
                            unoptimized
                            className="max-h-[78vh] max-w-[82vw] rounded-[1.5rem] object-contain brightness-[1.03] contrast-[1.06] saturate-[1.08]"
                        />

                        <div className="px-2 py-3">
                            <p className="text-sm font-black text-white">{name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                PESU profile photo
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
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
