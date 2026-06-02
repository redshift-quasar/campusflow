"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
    Armchair,
    BarChart3,
    CalendarDays,
    Clock3,
    FileText,
    Search,
    X,
} from "lucide-react";

import { navItems } from "@/components/layout/nav-items";
import { normalizeSearch } from "@/lib/academic-utils";
import { attendanceSubjects } from "@/lib/demo-data";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { usePesuResults } from "@/lib/hooks/use-pesu-results";
import { usePesuSeating } from "@/lib/hooks/use-pesu-seating";
import { usePesuTimetable } from "@/lib/hooks/use-pesu-timetable";
import { useSettingsStore } from "@/lib/store/settings-store";

type SearchPreviewMeta = {
    type: string;
    description?: string;
    code?: string;
    name?: string;
    attended?: number;
    total?: number;
    percentage?: number;
    faculty?: string;
    credits?: number;
    subject?: string;
    time?: string;
    room?: string;
    day?: string;
    grade?: string;
    exam?: string;
    seat?: string;
    date?: string;
    block?: string;
};

type SearchPreviewItem = {
    title: string;
    subtitle: string;
    href: string;
    icon: LucideIcon;
    group: string;
    keywords: string;
    meta: SearchPreviewMeta;
};

export function CommandPalette({
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

    const commandItems = useMemo<SearchPreviewItem[]>(() => {
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

    const activeSearchIndex =
        filteredItems.length > 0
            ? Math.min(activeIndex, filteredItems.length - 1)
            : 0;

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
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const item = container.querySelector<HTMLElement>(
            `[data-search-index="${activeSearchIndex}"]`
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
            const duration = 240;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
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
    }, [activeSearchIndex]);

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

    function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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

            const selectedItem = filteredItems[activeSearchIndex];

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

                    <div className="flex items-center gap-1.5 overflow-x-auto px-5 pb-3 pt-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
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
                    <div className="col-span-12 flex flex-col border-r-0 border-white/[0.08] md:col-span-7 md:border-r">
                        <div ref={scrollContainerRef} className="max-h-[460px] overflow-y-auto p-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
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

                                                    const keyboardActive = index === activeSearchIndex;

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
                                                                    <div className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/40" />
                                                                )}

                                                                <span className="relative z-10 flex min-w-0 items-center gap-3">
                                                                    <span
                                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition duration-200 ${keyboardActive
                                                                            ? "border-slate-950/10 bg-slate-950/5 text-slate-950"
                                                                            : "border-white/[0.08] bg-white/[0.045] text-slate-300 group-hover:bg-[#ffffff0e]"
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

                    <div className="hidden max-h-[460px] overflow-hidden bg-white/[0.01] md:col-span-5 md:block">
                        <SearchPreviewPanel item={filteredItems[activeSearchIndex]} target={target} />
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

function SearchPreviewPanel({
    item,
    target,
}: {
    item?: SearchPreviewItem;
    target: number;
}) {
    if (!item) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                <Search size={32} className="mb-3 opacity-25" />
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
        const attended = meta.attended ?? 0;
        const total = meta.total ?? 0;
        const percentage = meta.percentage ?? 0;

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
                                <span className="mb-1 block font-semibold text-slate-400">Path</span>
                                <code className="block truncate text-violet-300">{subtitle}</code>
                            </div>
                        </div>
                    )}

                    {isSubject && meta && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
                                    <p className={`mt-0.5 text-2xl font-black ${colorTheme === "emerald" ? "text-emerald-400" : "text-rose-400"}`}>
                                        {meta.percentage}%
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Classes</span>
                                    <p className="mt-0.5 text-2xl font-black text-white">
                                        {meta.attended}/{meta.total}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Faculty</span>
                                    <span className="font-medium text-white">{meta.faculty || "Not assigned"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Subject Code</span>
                                    <span className="font-mono text-white">{meta.code}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Credits</span>
                                    <span className="font-medium text-white">{meta.credits} credits</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-400">Status</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${colorTheme === "emerald" ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>
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
                                <p className="mt-0.5 text-lg font-black text-white">
                                    {meta.time}
                                </p>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Day</span>
                                    <span className="font-semibold text-white">{meta.day}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Room</span>
                                    <span className="font-semibold text-white">{meta.room || "No room assigned"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Faculty</span>
                                    <span className="font-semibold text-white">{meta.faculty || "Not synced"}</span>
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
                                    <p className="mt-0.5 text-2xl font-black text-indigo-400">
                                        {meta.grade}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Marks</span>
                                    <p className="mt-0.5 text-2xl font-black text-white">
                                        {meta.total}%
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Credits</span>
                                    <span className="font-medium text-white">{meta.credits} credits</span>
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
                                    <p className="mt-0.5 truncate text-lg font-black text-amber-400">
                                        {meta.room}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Terminal / Seat</span>
                                    <p className="mt-0.5 truncate text-lg font-black text-white">
                                        {meta.seat}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Assessment</span>
                                    <span className="font-bold text-white">{meta.exam}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Date</span>
                                    <span className="font-medium text-white">{meta.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-400">Time Slot</span>
                                    <span className="font-medium text-white">{meta.time}</span>
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

            <div className="mt-auto flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 text-[10px] font-semibold text-slate-500">
                <span>Navigate using arrows</span>
                <span className="flex items-center gap-1">
                    Press <kbd className="inline-flex h-4 items-center justify-center rounded bg-white/10 px-1 font-mono text-[9px] text-white">↵ Enter</kbd> to view
                </span>
            </div>
        </div>
    );
}
