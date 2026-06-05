"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InfoRow } from "@/components/dashboard/InfoRow";
import { RefreshCw } from "lucide-react";
import {
    usePesuTimetable,
    type AppTimetableSlot,
} from "@/lib/hooks/use-pesu-timetable";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioSectionHeader,

    StudioToneBadge,
} from "@/components/studio/Studio";
import type { LucideIcon } from "lucide-react";
import {
    BookOpen,
    CalendarDays,
    Clock3,
    GraduationCap,
    Layers3,
    MapPin,
    Timer,
    User2,
} from "lucide-react";

function getTodayName() {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long",
    });
}

function TimetableContent() {
    const {
        slotsByDay,
        days,
        roomId,
        lastFinalizedAt,
        source,
        usingDemoData,
    } = usePesuTimetable();
    const todayName = getTodayName();
    const [selectedDay, setSelectedDay] = useState(todayName);

    const searchParams = useSearchParams();
    const codeParam = searchParams.get("code");

    useEffect(() => {
        if (codeParam) {
            const foundDayGroup = slotsByDay.find((group) =>
                group.slots.some((slot) => slot.code === codeParam)
            );
            if (foundDayGroup) {
                const timer = setTimeout(() => {
                    setSelectedDay(foundDayGroup.day);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [codeParam, slotsByDay]);
    const selectedScheduleDay = days.includes(selectedDay)
        ? selectedDay
        : days.includes(todayName)
            ? todayName
            : days[0] ?? "Monday";

    useEffect(() => {
        if (codeParam) {
            const el = document.getElementById(`slot-${codeParam}`);
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 150);
                return () => clearTimeout(timer);
            }
        }
    }, [codeParam, selectedScheduleDay]);

    const selectedClasses = useMemo(() => {
        return (
            slotsByDay.find((group) => group.day === selectedScheduleDay)?.slots ??
            []
        );
    }, [selectedScheduleDay, slotsByDay]);

    const totalClasses = selectedClasses.length;
    const labCount = selectedClasses.filter((item) => item.type === "Lab").length;
    const lectureCount = selectedClasses.filter(
        (item) => item.type === "Lecture"
    ).length;

    const firstClass = selectedClasses[0];
    const lastClass = selectedClasses[selectedClasses.length - 1];
    const lastClassEndTime = lastClass ? getSlotEndTime(lastClass) : "-";

    return (
        <DashboardShell
            title="Timetable"
            subtitle="Weekly schedule, rooms, and class flow"
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge={source === "pesu" ? "Weekly Timetable / PESU Live" : "Weekly Timetable / Demo"}
                        title="Your week,"
                        mutedTitle="mapped clearly."
                        description="Switch between weekdays, check rooms and faculty, and understand your daily academic load in a clean timeline."
                    >
                        <div className="studio-card-soft p-5">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                Selected Day
                            </p>

                            <h3 className="mt-4 text-4xl font-black tracking-tight">
                                {selectedScheduleDay}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {totalClasses} scheduled class{totalClasses === 1 ? "" : "es"}
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <StudioMini label="Lectures" value={String(lectureCount)} />
                                <StudioMini label="Labs" value={String(labCount)} />
                                <StudioMini
                                    label="First Class"
                                    value={firstClass?.startTime ?? "-"}
                                    wide
                                />
                                <StudioMini
                                    label={source === "pesu" ? "PESU Live" : "Source"}
                                    value={
                                        source === "pesu"
                                            ? formatOptionalDate(lastFinalizedAt) || "Live"
                                            : "Demo"
                                    }
                                    wide
                                />
                            </div>
                        </div>
                    </StudioHero>
                </motion.div>

                <motion.section
                    variants={staggerContainer(0.08)}
                    initial="initial"
                    animate="animate"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <MetricMotionCard>
                        <MetricCard
                            label="Classes"
                            value={String(totalClasses)}
                            detail={`${selectedScheduleDay} schedule`}
                            icon={CalendarDays}
                            tone="primary"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Lectures"
                            value={String(lectureCount)}
                            detail="Theory sessions"
                            icon={BookOpen}
                            tone="safe"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Labs"
                            value={String(labCount)}
                            detail="Practical sessions"
                            icon={Layers3}
                            tone="warning"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Last Class"
                            value={lastClassEndTime}
                            detail={
                                source === "pesu" && lastFinalizedAt
                                    ? `Finalized ${formatOptionalDate(lastFinalizedAt)}`
                                    : lastClass?.subject ?? "No class"
                            }
                            icon={Clock3}
                            tone="violet"
                        />
                    </MetricMotionCard>
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <StudioSectionHeader
                                    eyebrow="Week"
                                    title="Day Selector"
                                    detail="Choose a weekday"
                                />

                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {days.map((day) => {
                                        const active = selectedScheduleDay === day;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDay(day)}
                                                className={`min-w-fit rounded-2xl border px-4 py-3 text-sm font-black transition duration-300 ${active
                                                    ? "border-white bg-white text-slate-950"
                                                    : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                                    }`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Schedule"
                                title={`${selectedScheduleDay}'s Classes`}
                                detail={`${totalClasses} sessions`}
                            />

                            <motion.div
                                variants={staggerContainer(0.1)}
                                initial="initial"
                                animate="animate"
                                className="mt-6 space-y-4"
                            >
                                {selectedClasses.length > 0 ? (
                                    selectedClasses.map((item, index) => (
                                        <TimetableRow
                                            key={getTimetableSlotKey(item, index, "row")}
                                            item={item}
                                            isLast={index === selectedClasses.length - 1}
                                            highlighted={item.code === codeParam}
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
                                            This day is currently free in {usingDemoData ? "demo" : "PESU"} timetable data.
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.section>
                    </main>

                    <aside className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-400">
                                        Day Overview
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        {selectedScheduleDay}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Quick summary of your academic load.
                                    </p>
                                </div>

                                <StudioIconBubble icon={Timer} tone="blue" />
                            </div>

                            <div className="studio-card-soft mt-6 space-y-3 p-5">
                                <InfoRow label="Total classes" value={String(totalClasses)} />
                                <InfoRow label="Lectures" value={String(lectureCount)} />
                                <InfoRow label="Labs" value={String(labCount)} />
                                <InfoRow label="First class" value={firstClass?.startTime ?? "-"} />
                                <InfoRow label="Last class" value={lastClassEndTime} />
                                <InfoRow
                                    label="Source"
                                    value={source === "pesu" ? "PESU Live" : "Demo fallback"}
                                />
                                {source === "pesu" && lastFinalizedAt && (
                                    <InfoRow
                                        label="Finalized"
                                        value={formatOptionalDate(lastFinalizedAt)}
                                    />
                                )}
                                {roomId && <InfoRow label="Room ID" value={roomId} />}
                            </div>
                        </motion.section>

                        {firstClass && (
                            <motion.section
                                variants={sectionMotion}
                                initial="initial"
                                animate="animate"
                                className="studio-card p-5"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400">
                                            First Session
                                        </p>

                                        <h2 className="mt-2 text-xl font-black tracking-tight">
                                            {firstClass.subject}
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Start your day at {firstClass.startTime}.
                                        </p>
                                    </div>

                                    <StudioIconBubble icon={GraduationCap} tone="green" />
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <StudioMini label="Code" value={firstClass.code} />
                                    <StudioMini label="Room" value={firstClass.room} />
                                    <StudioMini label="Faculty" value={firstClass.faculty} wide />
                                </div>
                            </motion.section>
                        )}

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Room Map"
                                title="Rooms Selected"
                                detail="Quick lookup"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 space-y-3"
                            >
                                {selectedClasses.map((item, index) => (
                                    <RoomItem
                                        key={getTimetableSlotKey(item, index, "room")}
                                        item={item}
                                    />
                                ))}
                            </motion.div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

export default function TimetablePage() {
    return (
        <Suspense fallback={
            <DashboardShell title="Timetable" subtitle="Loading weekly schedule...">
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
                        <p className="text-sm font-semibold text-slate-500">Loading schedule...</p>
                    </div>
                </div>
            </DashboardShell>
        }>
            <TimetableContent />
        </Suspense>
    );
}

function MetricMotionCard({ children }: { children: React.ReactNode }) {
    return (
        <motion.div variants={cardMotion} className="smooth-card">
            {children}
        </motion.div>
    );
}

function getTimetableSlotKey(
    item: AppTimetableSlot,
    index: number,
    scope: "row" | "room"
) {
    return `${scope}-${item.id || `${item.day}-${item.time}-${item.code}`}-${index}`;
}

function TimetableRow({
    item,
    isLast,
    highlighted,
}: {
    item: AppTimetableSlot;
    isLast: boolean;
    highlighted?: boolean;
}) {
    const tone =
        item.type === "Lab" ? "orange" : item.type === "Tutorial" ? "violet" : "blue";
    const endTime = getSlotEndTime(item);

    return (
        <motion.div id={`slot-${item.code}`} variants={cardMotion} className="grid grid-cols-[86px_1fr] gap-4">
            <div className="pt-4 text-right">
                <p className="text-sm font-black text-slate-300">{getSlotStartTime(item)}</p>
                <p className="mt-1 text-xs text-slate-600">{endTime}</p>
            </div>

            <div className="relative">
                {!isLast && (
                    <div className="absolute left-[15px] top-10 h-[calc(100%+1rem)] w-px bg-white/[0.08]" />
                )}

                <div className="flex gap-4">
                    <div className="relative z-10 mt-5 h-8 w-8 rounded-full border border-sky-300/30 bg-[#0b1020] shadow-lg shadow-sky-300/10">
                        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300" />
                    </div>

                    <div className={`flex-1 rounded-[1.5rem] border p-5 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055] ${
                        highlighted
                            ? "border-sky-500/50 bg-sky-500/[0.08] ring-2 ring-sky-500/20"
                            : "border-white/[0.07] bg-white/[0.035]"
                    }`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                        {item.code}
                                    </p>

                                    <StudioToneBadge tone={tone}>{item.type}</StudioToneBadge>
                                </div>

                                <h3 className="mt-2 text-lg font-black tracking-tight">
                                    {item.subject}
                                </h3>
                            </div>

                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-300 backdrop-blur-lg">
                                {getSlotStartTime(item)} - {endTime}
                            </div>
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

function getSlotEndTime(slot: AppTimetableSlot) {
    return slot.endTime || slot.time.split(" - ")[1] || slot.time || "-";
}

function getSlotStartTime(slot: AppTimetableSlot) {
    return slot.startTime || slot.time.split(" - ")[0] || slot.time || "-";
}

function RoomItem({
    item,
}: {
    item: AppTimetableSlot;
}) {
    return (
        <motion.div
            variants={cardMotion}
            className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055]"
        >
            <div>
                <p className="font-black">{item.room}</p>
                <p className="mt-1 text-xs text-slate-500">
                    {item.code} • {item.time}
                </p>
            </div>

            <MapPin size={17} className="text-slate-500" />
        </motion.div>
    );
}

function formatOptionalDate(value: string) {
    if (!value) return "";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString();
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
