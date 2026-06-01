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
import { todayClasses, weekDays } from "@/lib/demo-data";
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

export default function TodayPage() {
    const [selectedDay, setSelectedDay] = useState("Thu");

    const currentClass = useMemo(() => {
        return (
            todayClasses.find((item) => item.status === "ongoing") ?? todayClasses[0]
        );
    }, []);

    const completed = todayClasses.filter(
        (item) => item.status === "completed"
    ).length;

    const ongoing = todayClasses.filter(
        (item) => item.status === "ongoing"
    ).length;

    const upcoming = todayClasses.filter(
        (item) => item.status === "upcoming"
    ).length;

    return (
        <DashboardShell title="Today" subtitle="Your live academic schedule">
            <PremiumJoinSurface className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <PremiumJoinItem>
                    <StudioHero
                        badge="Live Schedule"
                        title="Today's academic flow,"
                        mutedTitle="organized clearly."
                        description="Track your current class, upcoming sessions, room details, and day overview in one smooth timeline."
                    >
                        <div className="studio-card-soft p-5">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                Current Class
                            </p>

                            <h3 className="mt-4 text-3xl font-black tracking-tight">
                                {currentClass.subject}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                {currentClass.room} • {currentClass.time} •{" "}
                                {currentClass.duration}
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <StudioMini label="Code" value={currentClass.code} />
                                <StudioMini label="Type" value={currentClass.type} />
                                <StudioMini label="Faculty" value={currentClass.faculty} wide />
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
                                        title="Thursday, 14 May"
                                        detail={`${todayClasses.length} classes scheduled`}
                                    />

                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {weekDays.map((day) => {
                                            const active = selectedDay === day.label;

                                            return (
                                                <button
                                                    key={day.label}
                                                    onClick={() => setSelectedDay(day.label)}
                                                    className={`min-w-16 rounded-2xl border px-4 py-3 text-center transition duration-300 ${active
                                                            ? "border-white bg-white text-slate-950"
                                                            : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                                        }`}
                                                >
                                                    <p className="text-xs font-bold">{day.label}</p>
                                                    <p className="mt-1 text-lg font-black">
                                                        {day.date}
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
                                    title="Today's Classes"
                                    detail="Live view"
                                />

                                <motion.div
                                    variants={staggerContainer(0.05)}
                                    initial="initial"
                                    animate="animate"
                                    className="mt-6 space-y-4"
                                >
                                    {todayClasses.map((item, index) => (
                                        <TimelineClass
                                            key={`${item.time}-${item.code}`}
                                            item={item}
                                            isLast={index === todayClasses.length - 1}
                                        />
                                    ))}
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
                                        {currentClass.code}
                                    </p>

                                    <h3 className="mt-2 text-2xl font-black tracking-tight">
                                        {currentClass.subject}
                                    </h3>

                                    <div className="mt-5">
                                        <InfoRow
                                            label="Time"
                                            value={`${currentClass.time} • ${currentClass.duration}`}
                                        />
                                        <InfoRow label="Room" value={currentClass.room} />
                                        <InfoRow label="Faculty" value={currentClass.faculty} />
                                        <InfoRow label="Type" value={currentClass.type} />
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
                                    <OverviewItem label="Academic load" value="4h 30m" />
                                    <OverviewItem label="First class" value="09:00 AM" />
                                    <OverviewItem label="Last class" value="04:00 PM" />
                                    <OverviewItem label="Labs today" value="1" />
                                </motion.div>
                            </section>
                        </PremiumJoinItem>

                        <PremiumJoinItem>
                            <section className="studio-card p-5">
                                <div className="flex items-start gap-4">
                                    <StudioIconBubble icon={CalendarDays} tone="violet" />

                                    <div>
                                        <h2 className="text-lg font-black tracking-tight">
                                            Tomorrow
                                        </h2>

                                        <p className="mt-2 text-sm leading-7 text-slate-400">
                                            Your first class tomorrow starts at 08:45 AM. Live
                                            timetable sync will be connected after PESU API
                                            integration.
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

function TimelineClass({
    item,
    isLast,
}: {
    item: {
        time: string;
        duration: string;
        subject: string;
        code: string;
        faculty: string;
        room: string;
        status: string;
        type: "Lecture" | "Lab" | "Tutorial";
    };
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