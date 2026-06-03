"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cardMotion, staggerContainer } from "@/lib/motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InfoRow } from "@/components/dashboard/InfoRow";
import {
    PremiumJoinItem,
    PremiumJoinSurface,
} from "@/components/ui/PremiumJoin";
import {
    usePesuTimetable,
    type AppTimetableSlot,
} from "@/lib/hooks/use-pesu-timetable";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioSectionHeader,
    StudioStatusBadge,
} from "@/components/studio/Studio";
import type { LucideIcon } from "lucide-react";
import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Timer,
    User2,
} from "lucide-react";

type SlotStatus = "completed" | "ongoing" | "upcoming";
type TodayDisplaySlot = AppTimetableSlot & {
    status: SlotStatus;
    duration: string;
};

function getTodayName() {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long",
    });
}

export default function TodayPage() {
    const { todaySlots, slotsByDay, days, lastFinalizedAt, source, usingDemoData } =
        usePesuTimetable();
    const todayName = getTodayName();
    const [selectedDay, setSelectedDay] = useState(todayName);
    const selectedScheduleDay =
        selectedDay === todayName || days.includes(selectedDay)
            ? selectedDay
            : days.includes(todayName)
                ? todayName
                : days[0] ?? todayName;

    const selectedRawSlots = useMemo(() => {
        if (selectedScheduleDay === todayName) return todaySlots;

        return (
            slotsByDay.find((group) => group.day === selectedScheduleDay)?.slots ??
            []
        );
    }, [selectedScheduleDay, slotsByDay, todayName, todaySlots]);

    const selectedClasses = useMemo(() => {
        return selectedRawSlots.map((slot) =>
            toTodayDisplaySlot(slot, selectedScheduleDay === todayName)
        );
    }, [selectedScheduleDay, selectedRawSlots, todayName]);

    const currentClass = useMemo(() => {
        return (
            selectedClasses.find((item) => item.status === "ongoing") ??
            selectedClasses.find((item) => item.status === "upcoming") ??
            selectedClasses[0] ??
            null
        );
    }, [selectedClasses]);

    const completed = selectedClasses.filter(
        (item) => item.status === "completed"
    ).length;

    const ongoing = selectedClasses.filter(
        (item) => item.status === "ongoing"
    ).length;

    const upcoming = selectedClasses.filter(
        (item) => item.status === "upcoming"
    ).length;
    const firstClass = selectedClasses[0] ?? null;
    const lastClass = selectedClasses[selectedClasses.length - 1] ?? null;
    const labCount = selectedClasses.filter((item) => item.type === "Lab").length;
    const academicLoad = getAcademicLoad(selectedClasses);
    const selectedDayLabel =
        selectedScheduleDay === todayName ? "Today" : selectedScheduleDay;
    const nextDay = getNextDay(days, selectedScheduleDay);
    const nextDayFirstClass =
        slotsByDay.find((group) => group.day === nextDay)?.slots[0] ?? null;
    const sourceLabel = source === "pesu" ? "PESU Live" : "Demo fallback";

    return (
        <DashboardShell title="Today" subtitle="Your live academic schedule">
            <PremiumJoinSurface className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <PremiumJoinItem>
                    <StudioHero
                        badge={source === "pesu" ? "Live Schedule / PESU Live" : "Live Schedule / Demo"}
                        title="Today's academic flow,"
                        mutedTitle="organized clearly."
                        description="Track your current class, upcoming sessions, room details, and day overview in one smooth timeline."
                    >
                        <div className="studio-card-soft p-5">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                Current Class
                            </p>

                            <h3 className="mt-4 text-3xl font-black tracking-tight">
                                {currentClass?.subject ?? "No class scheduled"}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {currentClass
                                    ? `${currentClass.room} • ${currentClass.time} • ${currentClass.duration}`
                                    : `${selectedDayLabel} has no timetable slots.`}
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <StudioMini label="Code" value={currentClass?.code ?? "-"} />
                                <StudioMini label="Type" value={currentClass?.type ?? "-"} />
                                <StudioMini
                                    label={source === "pesu" ? "PESU Live" : "Source"}
                                    value={
                                        source === "pesu"
                                            ? formatOptionalDate(lastFinalizedAt) || "Live"
                                            : "Demo"
                                    }
                                />
                                <StudioMini
                                    label="Faculty"
                                    value={currentClass?.faculty ?? "-"}
                                    wide
                                />
                            </div>
                        </div>
                    </StudioHero>
                </PremiumJoinItem>

                <motion.section
                    variants={staggerContainer(0.06)}
                    initial="initial"
                    animate="animate"
                    className="grid gap-4 md:grid-cols-3"
                >
                    <MetricMotionCard>
                        <MetricCard
                            label="Completed"
                            value={String(completed)}
                            detail="Classes finished"
                            icon={CheckCircle2}
                            tone="safe"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Ongoing"
                            value={String(ongoing)}
                            detail="Class in progress"
                            icon={Timer}
                            tone="primary"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Upcoming"
                            value={String(upcoming)}
                            detail="Remaining today"
                            icon={Clock3}
                            tone="warning"
                        />
                    </MetricMotionCard>
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="space-y-6">
                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                    <StudioSectionHeader
                                        eyebrow="Week Selector"
                                        title={selectedDayLabel}
                                        detail={`${selectedClasses.length} classes scheduled`}
                                    />

                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {days.map((day, index) => {
                                            const active = selectedScheduleDay === day;

                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => setSelectedDay(day)}
                                                    className={`min-w-16 rounded-2xl border px-4 py-3 text-center transition duration-300 ${active
                                                            ? "border-white bg-white text-slate-950"
                                                            : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                                        }`}
                                                >
                                                    <p className="text-xs font-bold">{day.slice(0, 3)}</p>
                                                    <p className="mt-1 text-lg font-black">
                                                        {day === todayName
                                                            ? "Today"
                                                            : String(index + 1).padStart(2, "0")}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>
                        </PremiumJoinItem>

                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <StudioSectionHeader
                                    eyebrow="Timeline"
                                    title={`${selectedDayLabel}'s Classes`}
                                    detail={sourceLabel}
                                />

                                <motion.div
                                    variants={staggerContainer(0.05)}
                                    initial="initial"
                                    animate="animate"
                                    className="mt-6 space-y-4"
                                >
                                    {selectedClasses.length > 0 ? (
                                        selectedClasses.map((item, index) => (
                                            <TimelineClass
                                                key={`${item.day}-${item.time}-${item.code}-${index}`}
                                                item={item}
                                                isLast={index === selectedClasses.length - 1}
                                            />
                                        ))
                                    ) : (
                                        <motion.div
                                            variants={cardMotion}
                                            className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-8 text-center backdrop-blur-xl"
                                        >
                                            <p className="font-black text-slate-300">
                                                No classes scheduled
                                            </p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                This day is currently free in{" "}
                                                {usingDemoData ? "demo" : "PESU"} timetable data.
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </section>
                        </PremiumJoinItem>
                    </main>

                    <aside className="space-y-6">
                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400">Now</p>

                                        <h2 className="mt-2 text-2xl font-black tracking-tight">
                                            Current Class
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Live class details for the active slot.
                                        </p>
                                    </div>

                                    <StudioIconBubble icon={BookOpen} tone="blue" />
                                </div>

                                <div className="studio-card-soft mt-6 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-600">
                                        {currentClass?.code ?? "NO SLOT"}
                                    </p>

                                    <h3 className="mt-2 text-2xl font-black tracking-tight">
                                        {currentClass?.subject ?? "No class scheduled"}
                                    </h3>

                                    <div className="mt-5">
                                        <InfoRow
                                            label="Time"
                                            value={
                                                currentClass
                                                    ? `${currentClass.time} • ${currentClass.duration}`
                                                    : "-"
                                            }
                                        />
                                        <InfoRow label="Room" value={currentClass?.room ?? "-"} />
                                        <InfoRow
                                            label="Faculty"
                                            value={currentClass?.faculty ?? "-"}
                                        />
                                        <InfoRow label="Type" value={currentClass?.type ?? "-"} />
                                        <InfoRow label="Source" value={sourceLabel} />
                                        {source === "pesu" && lastFinalizedAt && (
                                            <InfoRow
                                                label="Finalized"
                                                value={formatOptionalDate(lastFinalizedAt)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </section>
                        </PremiumJoinItem>

                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <StudioSectionHeader
                                    eyebrow="Overview"
                                    title="Day Summary"
                                    detail="Quick stats"
                                />

                                <motion.div
                                    variants={staggerContainer(0.05)}
                                    initial="initial"
                                    animate="animate"
                                    className="mt-5 space-y-3"
                                >
                                    <OverviewItem label="Academic load" value={academicLoad} />
                                    <OverviewItem
                                        label="First class"
                                        value={firstClass?.startTime ?? "-"}
                                    />
                                    <OverviewItem
                                        label="Last class"
                                        value={lastClass?.endTime ?? "-"}
                                    />
                                    <OverviewItem label="Labs today" value={String(labCount)} />
                                    <OverviewItem label="Source" value={sourceLabel} />
                                    {source === "pesu" && lastFinalizedAt && (
                                        <OverviewItem
                                            label="Finalized"
                                            value={formatOptionalDate(lastFinalizedAt)}
                                        />
                                    )}
                                </motion.div>
                            </section>
                        </PremiumJoinItem>

                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <div className="flex items-start gap-4">
                                    <StudioIconBubble icon={CalendarDays} tone="violet" />

                                    <div>
                                        <h2 className="text-lg font-black tracking-tight">
                                            Next Scheduled Day
                                        </h2>

                                        <p className="mt-2 text-sm leading-7 text-slate-400">
                                            {nextDayFirstClass
                                                ? `${nextDay}'s first class starts at ${nextDayFirstClass.startTime}: ${nextDayFirstClass.subject}.`
                                                : `No upcoming timetable slots found in ${sourceLabel}.`}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </PremiumJoinItem>
                    </aside>
                </section>
            </PremiumJoinSurface>
        </DashboardShell>
    );
}

function MetricMotionCard({ children }: { children: ReactNode }) {
    return (
        <motion.div variants={cardMotion} className="smooth-card">
            {children}
        </motion.div>
    );
}

function toTodayDisplaySlot(
    slot: AppTimetableSlot,
    compareWithCurrentTime: boolean
): TodayDisplaySlot {
    return {
        ...slot,
        status: compareWithCurrentTime ? getSlotStatus(slot) : "upcoming",
        duration: getSlotDuration(slot),
    };
}

function getSlotStatus(slot: AppTimetableSlot): SlotStatus {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime) ?? (start === null ? null : start + 60);

    if (start === null || end === null) return "upcoming";

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes < start) return "upcoming";
    if (currentMinutes <= end) return "ongoing";

    return "completed";
}

function getSlotDuration(slot: AppTimetableSlot) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);

    if (start === null || end === null || end <= start) return slot.time;

    return formatDuration(end - start);
}

function getAcademicLoad(slots: TodayDisplaySlot[]) {
    const minutes = slots.reduce((total, slot) => {
        const start = parseTimeToMinutes(slot.startTime);
        const end = parseTimeToMinutes(slot.endTime);

        if (start === null || end === null || end <= start) return total;

        return total + end - start;
    }, 0);

    if (minutes <= 0) return slots.length ? `${slots.length} sessions` : "No classes";

    return formatDuration(minutes);
}

function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!hours) return `${remainingMinutes}m`;
    if (!remainingMinutes) return `${hours}h`;

    return `${hours}h ${remainingMinutes}m`;
}

function parseTimeToMinutes(value: string) {
    const clean = value.trim().replace(/\./g, "").toUpperCase();
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);

    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2] ?? "0");
    const meridiem = match[3];

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;

    if (hour > 23 || minute > 59) return null;

    return hour * 60 + minute;
}

function getNextDay(days: string[], selectedDay: string) {
    if (!days.length) return "";

    const index = days.indexOf(selectedDay);

    if (index < 0) return days[0];

    return days[(index + 1) % days.length];
}

function formatOptionalDate(value: string) {
    if (!value) return "";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString();
}

function TimelineClass({
    item,
    isLast,
}: {
    item: TodayDisplaySlot;
    isLast: boolean;
}) {
    const active = item.status === "ongoing";

    return (
        <motion.div variants={cardMotion} className="grid grid-cols-[80px_1fr] gap-4">
            <div className="pt-4 text-right">
                <p className="text-sm font-black text-slate-300">{item.time}</p>
                <p className="mt-1 text-xs text-slate-600">{item.duration}</p>
            </div>

            <div className="relative">
                {!isLast && (
                    <div className="absolute left-[15px] top-10 h-[calc(100%+1rem)] w-px bg-white/[0.08]" />
                )}

                <div className="flex gap-4">
                    <div
                        className={`relative z-10 mt-5 h-8 w-8 rounded-full border ${active
                                ? "border-sky-300 bg-sky-300 shadow-lg shadow-sky-300/20"
                                : item.status === "completed"
                                    ? "border-emerald-300 bg-emerald-300"
                                    : "border-white/[0.12] bg-[#0b1020]"
                            }`}
                    />

                    <div
                        className={`flex-1 rounded-[1.5rem] border p-5 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 ${active
                                ? "border-sky-300/20 bg-sky-300/[0.08]"
                                : "border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.055]"
                            }`}
                    >
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                        {item.code}
                                    </p>

                                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-400">
                                        {item.type}
                                    </span>
                                </div>

                                <h3 className="mt-2 text-lg font-black tracking-tight">
                                    {item.subject}
                                </h3>
                            </div>

                            <StudioStatusBadge
                                status={item.status as "completed" | "ongoing" | "upcoming"}
                            />
                        </div>

                        <div className="grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                            <InfoLine icon={MapPin} text={item.room} />
                            <InfoLine icon={User2} text={item.faculty} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function InfoLine({
    icon: Icon,
    text,
}: {
    icon: LucideIcon;
    text: string;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <Icon size={15} className="text-slate-500" />
            <span>{text}</span>
        </div>
    );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
    return (
        <motion.div
            variants={cardMotion}
            className="flex items-center justify-between rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] px-4 py-3 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055]"
        >
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-black text-slate-200">{value}</span>
        </motion.div>
    );
}
