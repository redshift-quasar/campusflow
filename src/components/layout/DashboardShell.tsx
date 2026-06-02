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
import { attendanceSubjects } from "@/lib/demo-data";
import { usePesuSeating } from "@/lib/hooks/use-pesu-seating";
import { normalizeSearch } from "@/lib/academic-utils";
import { PesuSyncBadge } from "@/components/layout/PesuSyncBadge";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { usePesuResults } from "@/lib/hooks/use-pesu-results";
import { usePesuTimetable } from "@/lib/hooks/use-pesu-timetable";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { pageMotion } from "@/lib/motion";
import { useSettingsStore } from "@/lib/store/settings-store";

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
    const { seating: seatingRecords } = usePesuSeating();

    const searchableAttendanceSubjects =
        syncedSubjects.length > 0 ? syncedSubjects : attendanceSubjects;

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("all");

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const target = useSettingsStore((state) => state.attendanceTarget);

    const categories = [
        { id: "all", label: "All" },
        { id: "pages", label: "Pages" },
        { id: "attendance", label: "Attendance" },
        { id: "schedule", label: "Schedule" },
        { id: "results", label: "Results" },
        { id: "exams", label: "Exams" },
    ];

    const commandItems = useMemo(() => {
        const pageItems = navItems.map((item) => ({
            title: item.label,
            subtitle: item.href,
            href: item.href,
            icon: item.icon,
            group: "Pages",
            keywords: `${item.label} ${item.href}`,
            meta: {
                type: "page",
                description: item.label === "Dashboard" ? "Your academic command center. View live attendance summary, quick stats, today's classes, exams, results, and quick actions."
                    : item.label === "Attendance" ? "Track your subject-wise attendance percentages, see how many classes you can afford to bunk or need to attend to meet your target."
                        : item.label === "Timetable" ? "Look at your weekly class schedule slot-by-slot, showing rooms, slots, days, and times."
                            : item.label === "Results" ? "Check your academic marks, SGPA/CGPA records, credits, and subject grades."
                                : item.label === "Seating" ? "View your seating arrangements, dates, times, and exam blocks for scheduled exams."
                                    : "Configure application settings, targets, and privacy session options."
            }
        }));

        const subjectItems = searchableAttendanceSubjects.map((subject) => {
            const pct = subject.total > 0 ? Math.round((subject.attended / subject.total) * 100) : 0;
            return {
                title: subject.name,
                subtitle: `${subject.code} • Attendance • ${subject.faculty ?? "Faculty not synced"}`,
                href: "/attendance",
                icon: BarChart3,
                group: "Subjects",
                keywords: `${subject.name} ${subject.code} ${subject.faculty ?? ""} attendance`,
                meta: {
                    type: "subject",
                    code: subject.code,
                    name: subject.name,
                    attended: subject.attended,
                    total: subject.total,
                    percentage: pct,
                    faculty: subject.faculty,
                    credits: subject.credits
                }
            };
        });

        const todayItems = todaySlots.map((item) => ({
            title: item.subject,
            subtitle: `${item.time} • ${item.room} • Today`,
            href: "/today",
            icon: Clock3,
            group: "Today",
            keywords: `${item.subject} ${item.code} ${item.time} ${item.room} ${item.faculty}`,
            meta: {
                type: "schedule",
                subject: item.subject,
                code: item.code,
                time: item.time,
                room: item.room,
                faculty: item.faculty,
                day: "Today"
            }
        }));

        const timetableItems = timetableSlots.map((item) => ({
            title: item.subject,
            subtitle: `${item.day} • ${item.time} • ${item.room}`,
            href: "/timetable",
            icon: CalendarDays,
            group: "Timetable",
            keywords: `${item.subject} ${item.code} ${item.day} ${item.time} ${item.room} ${item.faculty}`,
            meta: {
                type: "schedule",
                subject: item.subject,
                code: item.code,
                time: item.time,
                room: item.room,
                faculty: item.faculty,
                day: item.day
            }
        }));

        const resultSearchItems = resultItems.map((item) => ({
            title: item.subject,
            subtitle: `${item.code} • ${item.total}% • Grade ${item.grade}`,
            href: "/results",
            icon: FileText,
            group: "Results",
            keywords: `${item.subject} ${item.code} ${item.grade} result marks`,
            meta: {
                type: "result",
                subject: item.subject,
                code: item.code,
                total: item.total,
                grade: item.grade,
                credits: item.credits
            }
        }));

        const seatingItems = seatingRecords.map((exam) => ({
            title: exam.subject,
            subtitle: `${exam.exam} • ${getExamLocationText(exam.room, exam.block)} • Terminal ${exam.seat}`,
            href: "/seating",
            icon: Armchair,
            group: "Exam Seating",
            keywords: `${exam.subject} ${exam.code} ${exam.exam} ${exam.room} ${exam.seat} ${exam.block} terminal seating room block`,
            meta: {
                type: "seating",
                subject: exam.subject,
                exam: exam.exam,
                code: exam.code,
                room: exam.room,
                seat: exam.seat,
                date: exam.date,
                time: exam.time,
                block: exam.block
            }
        }));
        return [
            ...pageItems,
            ...subjectItems,
            ...todayItems,
            ...timetableItems,
            ...resultSearchItems,
            ...seatingItems,
        ];
    }, [
        resultItems,
        searchableAttendanceSubjects,
        seatingRecords,
        timetableSlots,
        todaySlots,
    ]);

    function getExamLocationText(room?: string, block?: string) {
        const cleanRoom = room?.trim() ?? "";
        const cleanBlock = block?.trim() ?? "";

        if (!cleanRoom && !cleanBlock) return "Location not synced";
        if (!cleanRoom) return cleanBlock;
        if (!cleanBlock) return cleanRoom;

        if (cleanRoom.toLowerCase() === cleanBlock.toLowerCase()) {
            return cleanRoom;
        }

        return `${cleanBlock} • ${cleanRoom}`;
    }

    const filteredByCategory = useMemo(() => {
        if (selectedCategory === "all") return commandItems;
        if (selectedCategory === "pages") return commandItems.filter(item => item.group === "Pages");
        if (selectedCategory === "attendance") return commandItems.filter(item => item.group === "Subjects");
        if (selectedCategory === "schedule") return commandItems.filter(item => item.group === "Today" || item.group === "Timetable");
        if (selectedCategory === "results") return commandItems.filter(item => item.group === "Results");
        if (selectedCategory === "exams") return commandItems.filter(item => item.group === "Exam Seating");
        return commandItems;
    }, [commandItems, selectedCategory]);

    const filteredItems = useMemo(() => {
        const rawSearch = query.toLowerCase().trim();
        const normalizedSearch = normalizeSearch(query);

        if (!rawSearch) return filteredByCategory.slice(0, 12);

        return filteredByCategory
            .filter((item) => {
                const rawKeywords = item.keywords.toLowerCase();
                const normalizedKeywords = normalizeSearch(item.keywords);

                return (
                    rawKeywords.includes(rawSearch) ||
                    normalizedKeywords.includes(normalizedSearch)
                );
            })
            .slice(0, 18);
    }, [filteredByCategory, query]);

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
        if (filteredItems.length === 0) {
            setActiveIndex(0);
            return;
        }

        if (activeIndex > filteredItems.length - 1) {
            setActiveIndex(filteredItems.length - 1);
        }
    }, [activeIndex, filteredItems.length]);

    useEffect(() => {
        // Lock body scroll when search modal is open
        document.body.style.overflow = "hidden";
        return () => {
            // Restore body scroll when search modal closes
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const item = container.querySelector<HTMLElement>(
            `[data-search-index="${activeIndex}"]`
        );
        if (!item) return;

        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        const relativeItemTop = itemRect.top - containerRect.top + container.scrollTop;
        const relativeItemBottom = relativeItemTop + itemRect.height;
        const scrollTop = container.scrollTop;
        const viewBottom = scrollTop + container.clientHeight;

        let targetScrollTop = scrollTop;

        if (relativeItemBottom > viewBottom) {
            targetScrollTop = relativeItemBottom - container.clientHeight + 8;
        } else if (relativeItemTop < scrollTop) {
            targetScrollTop = relativeItemTop - 8;
        }

        if (targetScrollTop !== scrollTop) {
            const start = container.scrollTop;
            const change = targetScrollTop - start;
            const duration = 240; // ms
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);
                container.scrollTop = start + change * ease;

                if (progress < 1) {
                    scrollAnimationRef.current = requestAnimationFrame(animate);
                }
            };

            if (scrollAnimationRef.current) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
            scrollAnimationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (scrollAnimationRef.current) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
        };
    }, [activeIndex]);

    function handleClose() {
        setQuery("");
        setActiveIndex(0);
        setSelectedCategory("all");
        onClose();
    }

    function handleOpenItem(href: string) {
        handleClose();
        router.push(href);
    }

    function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Tab") {
            event.preventDefault();
            const dir = event.shiftKey ? -1 : 1;
            const currentIndex = categories.findIndex((c) => c.id === selectedCategory);
            const nextIndex = (currentIndex + dir + categories.length) % categories.length;
            setSelectedCategory(categories[nextIndex].id);
            setActiveIndex(0);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex((current) =>
                current >= filteredItems.length - 1 ? 0 : current + 1
            );

            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex((current) =>
                current <= 0 ? filteredItems.length - 1 : current - 1
            );

            return;
        }

        if (event.key === "Home") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex(0);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();

            if (filteredItems.length === 0) return;

            setActiveIndex(filteredItems.length - 1);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            const selectedItem = filteredItems[activeIndex];

            if (selectedItem) {
                handleOpenItem(selectedItem.href);
            }

            return;
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
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 px-4 pt-16 backdrop-blur-md sm:pt-20"
        >
            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{
                    duration: 0.32,
                    ease: [0.16, 1, 0.3, 1],
                }}
                className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[#080d1d]/90 shadow-2xl shadow-black/60 backdrop-blur-3xl"
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

                    <div className="flex items-center gap-1.5 overflow-x-auto px-5 pb-3 pt-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                        {categories.map((cat) => {
                            const active = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setActiveIndex(0);
                                    }}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-black tracking-tight transition duration-200 ${active
                                            ? "bg-white text-slate-950 shadow-md shadow-white/5"
                                            : "border border-white/[0.05] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid md:grid-cols-12">
                    <div className="col-span-12 md:col-span-7 flex flex-col border-r-0 md:border-r border-white/[0.08]">
                        <div ref={scrollContainerRef} className="max-h-[460px] overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                            {filteredItems.length > 0 ? (
                                <div className="space-y-5">
                                    {groupedItems.map((group) => (
                                        <div key={group.group}>
                                            <div className="mb-2 px-2">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                                                    {group.group}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                {group.items.map(({ item, index }) => {
                                                    const currentPage =
                                                        pathname === item.href ||
                                                        pathname.startsWith(`${item.href}/`);

                                                    const keyboardActive = index === activeIndex;

                                                    const Icon = item.icon;

                                                    return (
                                                        <motion.div
                                                            key={`${item.group}-${item.title}-${index}`}
                                                            data-search-index={index}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{
                                                                delay: index * 0.018,
                                                                duration: 0.22,
                                                            }}
                                                            className="relative"
                                                        >
                                                            <Link
                                                                href={item.href}
                                                                onClick={handleClose}
                                                                onMouseEnter={() => setActiveIndex(index)}
                                                                className="group relative flex items-center justify-between rounded-2xl px-4 py-3 transition-colors duration-200"
                                                            >
                                                                {keyboardActive && (
                                                                    <motion.div
                                                                        layoutId="search-active-bg"
                                                                        className="absolute inset-0 rounded-2xl bg-white shadow-lg shadow-white/10"
                                                                        transition={{
                                                                            type: "spring",
                                                                            stiffness: 380,
                                                                            damping: 30
                                                                        }}
                                                                    />
                                                                )}

                                                                {!keyboardActive && currentPage && (
                                                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/40" />
                                                                )}

                                                                <span className="relative z-10 flex min-w-0 items-center gap-3">
                                                                    <span
                                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition duration-200 ${keyboardActive
                                                                            ? "border-slate-950/10 bg-slate-950/5 text-slate-950"
                                                                            : "border-white/[0.08] bg-white/[0.045] group-hover:bg-[#ffffff0e] text-slate-300"
                                                                            }`}
                                                                    >
                                                                        <Icon size={18} />
                                                                    </span>

                                                                    <span className="min-w-0">
                                                                        <span className={`block truncate text-sm font-black transition-colors duration-200 ${keyboardActive ? "text-slate-950" : "text-white"}`}>
                                                                            {item.title}
                                                                        </span>

                                                                        <span
                                                                            className={`mt-1 block truncate text-xs transition-colors duration-200 ${keyboardActive
                                                                                ? "text-slate-600"
                                                                                : "text-slate-500"
                                                                                }`}
                                                                        >
                                                                            {item.subtitle}
                                                                        </span>
                                                                    </span>
                                                                </span>

                                                                {keyboardActive && (
                                                                    <span className="relative z-10 ml-3 shrink-0 text-slate-400">
                                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M6 3L10.5 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </span>
                                                                )}
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
                    </div>

                    <div className="hidden md:block md:col-span-5 bg-white/[0.01] overflow-hidden max-h-[460px]">
                        <SearchPreviewPanel item={filteredItems[activeIndex]} target={target} />
                    </div>
                </div>

                <div className="flex items-center gap-4 border-t border-white/[0.08] px-5 py-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[10px] text-slate-400">↑</kbd>
                        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[10px] text-slate-400">↓</kbd>
                        <span className="ml-0.5">Navigate</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="inline-flex h-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 font-mono text-[10px] text-slate-400">Tab</kbd>
                        <span>Switch Categories</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="inline-flex h-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 font-mono text-[10px] text-slate-400">↵</kbd>
                        <span>Open</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="inline-flex h-5 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 font-mono text-[10px] text-slate-400">esc</kbd>
                        <span>Close</span>
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}

function SearchPreviewPanel({ item, target }: { item: any; target: number }) {
    if (!item) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                <Search size={32} className="opacity-25 mb-3" />
                <p className="text-xs font-semibold">Select an item to view details</p>
            </div>
        );
    }

    const { title, subtitle, group, meta, icon: Icon } = item;
    const isPage = group === "Pages";
    const isSubject = group === "Subjects";
    const isSchedule = group === "Today" || group === "Timetable";
    const isResult = group === "Results";
    const isSeating = group === "Exam Seating";

    let colorTheme = "sky";
    if (isPage) colorTheme = "violet";
    else if (isSubject) colorTheme = (meta?.percentage ?? 0) >= target ? "emerald" : "rose";
    else if (isSchedule) colorTheme = "sky";
    else if (isResult) colorTheme = "indigo";
    else if (isSeating) colorTheme = "amber";

    const colorClasses: Record<string, { border: string; text: string; bg: string; glow: string }> = {
        sky: { border: "border-sky-500/20", text: "text-sky-400", bg: "bg-sky-500/5", glow: "shadow-sky-500/10" },
        violet: { border: "border-violet-500/20", text: "text-violet-400", bg: "bg-violet-500/5", glow: "shadow-violet-500/10" },
        emerald: { border: "border-emerald-500/20", text: "text-emerald-400", bg: "bg-emerald-500/5", glow: "shadow-emerald-500/10" },
        rose: { border: "border-rose-500/20", text: "text-rose-400", bg: "bg-rose-500/5", glow: "shadow-rose-500/10" },
        indigo: { border: "border-indigo-500/20", text: "text-indigo-400", bg: "bg-indigo-500/5", glow: "shadow-indigo-500/10" },
        amber: { border: "border-amber-500/20", text: "text-amber-400", bg: "bg-amber-500/5", glow: "shadow-amber-500/10" },
    };

    const activeTheme = colorClasses[colorTheme] || colorClasses.sky;

    let attendanceText = "";
    let attendanceStatus = "";
    if (isSubject && meta) {
        const { attended, total, percentage } = meta;
        if (percentage >= target) {
            attendanceStatus = "Safe";
            const maxBunk = total > 0 ? Math.floor((attended - (total * (target / 100))) / (target / 100)) : 0;
            const safeBunk = Math.max(0, maxBunk);
            attendanceText = safeBunk > 0
                ? `You can safely bunk the next ${safeBunk} class${safeBunk > 1 ? "es" : ""}.`
                : "You are exactly on target. Don't bunk any classes.";
        } else {
            attendanceStatus = "Critical";
            const targetFrac = target / 100;
            const req = targetFrac < 1 ? Math.ceil((targetFrac * total - attended) / (1 - targetFrac)) : 0;
            const safeReq = Math.max(0, req);
            attendanceText = `Attend the next ${safeReq} class${safeReq > 1 ? "es" : ""} to reach ${target}%.`;
        }
    }

    return (
        <div className="flex h-full flex-col justify-between p-6">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border ${activeTheme.border} ${activeTheme.bg} ${activeTheme.text} shadow-lg ${activeTheme.glow} transition duration-300`}>
                        <Icon size={24} />
                    </div>
                    <div className="min-w-0">
                        <span className={`inline-flex items-center rounded-full border ${activeTheme.border} ${activeTheme.bg} px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${activeTheme.text}`}>
                            {group}
                        </span>
                        <h3 className="mt-1 truncate text-lg font-black tracking-tight text-white">
                            {title}
                        </h3>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-white/[0.06]" />

                <div className="space-y-4">
                    {isPage && (
                        <div className="space-y-3">
                            <p className="text-sm leading-6 text-slate-400">
                                {meta?.description}
                            </p>
                            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs text-slate-500">
                                <span className="font-semibold block text-slate-400 mb-1">Path</span>
                                <code className="text-violet-300 block truncate">{subtitle}</code>
                            </div>
                        </div>
                    )}

                    {isSubject && meta && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
                                    <p className={`text-2xl font-black mt-0.5 ${colorTheme === "emerald" ? "text-emerald-400" : "text-rose-400"}`}>
                                        {meta.percentage}%
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Classes</span>
                                    <p className="text-2xl font-black mt-0.5 text-white">
                                        {meta.attended}/{meta.total}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Faculty</span>
                                    <span className="text-white font-medium">{meta.faculty || "Not assigned"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Subject Code</span>
                                    <span className="font-mono text-white">{meta.code}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Credits</span>
                                    <span className="text-white font-medium">{meta.credits} credits</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Status</span>
                                    <span className={`font-black uppercase tracking-wider text-[10px] rounded-full px-2 py-0.5 ${colorTheme === "emerald" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                        {attendanceStatus}
                                    </span>
                                </div>
                            </div>

                            <div className={`rounded-xl border ${activeTheme.border} ${activeTheme.bg} p-3 text-xs leading-5 ${activeTheme.text}`}>
                                {attendanceText}
                            </div>
                        </div>
                    )}

                    {isSchedule && meta && (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Timing</span>
                                <p className="text-lg font-black mt-0.5 text-white">
                                    {meta.time}
                                </p>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Day</span>
                                    <span className="text-white font-semibold">{meta.day}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Room</span>
                                    <span className="text-white font-semibold">{meta.room || "No room assigned"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Faculty</span>
                                    <span className="text-white font-semibold">{meta.faculty || "Not synced"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Code</span>
                                    <span className="font-mono text-slate-300">{meta.code}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isResult && meta && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grade</span>
                                    <p className="text-2xl font-black mt-0.5 text-indigo-400">
                                        {meta.grade}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Marks</span>
                                    <p className="text-2xl font-black mt-0.5 text-white">
                                        {meta.total}%
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Credits</span>
                                    <span className="text-white font-medium">{meta.credits} credits</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Course Code</span>
                                    <span className="font-mono text-slate-300">{meta.code}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSeating && meta && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Room / Hall</span>
                                    <p className="text-lg font-black mt-0.5 text-amber-400 truncate">
                                        {meta.room}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Terminal / Seat</span>
                                    <p className="text-lg font-black mt-0.5 text-white truncate">
                                        {meta.seat}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Assessment</span>
                                    <span className="text-white font-bold">{meta.exam}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Date</span>
                                    <span className="text-white font-medium">{meta.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Time Slot</span>
                                    <span className="text-white font-medium">{meta.time}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Block Name</span>
                                    <span className="text-slate-300">{meta.block}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 text-[10px] font-semibold text-slate-500 flex items-center justify-between mt-auto">
                <span>Navigate using arrows</span>
                <span className="flex items-center gap-1">
                    Press <kbd className="inline-flex h-4 items-center justify-center rounded bg-white/10 px-1 font-mono text-[9px] text-white">↵ Enter</kbd> to view
                </span>
            </div>
        </div>
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
