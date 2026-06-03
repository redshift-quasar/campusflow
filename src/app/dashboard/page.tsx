"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    GraduationCap,
    LayoutDashboard,
    MapPinned,
    RefreshCw,
    Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
    calendarEvents,
    dashboardUpdates,
    todayClasses as demoTodayClasses,
} from "@/lib/demo-data";
import {
    getAttendancePercent,
    getCriticalSubject,
    getLowAttendanceSubjects,
    getSafeSubjects,
    getWarningSubjects,
    type AttendanceSubject,
    type ProgressTone,
} from "@/lib/academic-utils";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioProgressBar,
    StudioSectionHeader,
} from "@/components/studio/Studio";

type Tone = "blue" | "green" | "orange" | "violet" | "red" | "slate";

type DashboardClassStatus = "ongoing" | "upcoming" | "completed";

type DashboardClass = {
    id: string;
    status: DashboardClassStatus;
    subject: string;
    code: string;
    time: string;
    room: string;
    day: string;
};

type DashboardSeatingItem = {
    assessment?: string;
    code?: string;
    date?: string;
    time?: string;
    terminal?: string;
    block?: string;
    subject?: string | null;
};

type DashboardTimetableSlot = {
    id?: string;
    day?: string;
    code?: string;
    subject?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    room?: string;
    roomId?: string | null;
};

type DashboardResultCourse = {
    code?: string;
    name?: string;
    grade?: string | null;
    credits?: number | null;
};

const quickActions = [
    {
        label: "Attendance",
        href: "/attendance",
        detail: "Risk and recovery",
        icon: BarChart3,
        tone: "red",
    },
    {
        label: "Timetable",
        href: "/timetable",
        detail: "Weekly class flow",
        icon: CalendarDays,
        tone: "blue",
    },
    {
        label: "Results",
        href: "/results",
        detail: "Marks and SGPA",
        icon: GraduationCap,
        tone: "violet",
    },
    {
        label: "Seating",
        href: "/seating",
        detail: "Exam room and terminal",
        icon: MapPinned,
        tone: "green",
    },
] satisfies {
    label: string;
    href: string;
    detail: string;
    icon: LucideIcon;
    tone: Tone;
}[];

export default function DashboardPage() {
    const { user } = useLocalAuth({ redirectIfMissing: true });
    const { session, refreshSession } = usePesuSession();

    const displayName =
        session.profile?.name ?? user?.name ?? user?.srn ?? session.srn ?? "Student";

    const attendanceTarget = useSettingsStore((state) => state.attendanceTarget);

    const {
        subjects,
        source,
        syncedAt,
        usingDemoData,
        syncAttendance,
    } = usePesuAttendance();

    const timetableSlots = useMemo(
        () => (session.timetable?.slots ?? []) as DashboardTimetableSlot[],
        [session.timetable?.slots]
    );
    const resultCourses = useMemo(
        () => (session.results?.courses ?? []) as DashboardResultCourse[],
        [session.results?.courses]
    );
    const seatingItems = useMemo(
        () => (session.seating?.items ?? []) as DashboardSeatingItem[],
        [session.seating?.items]
    );

    function handleRefresh() {
        void syncAttendance();
        void refreshSession();
    }

    const attendanceSummary = useMemo(() => {
        const average =
            subjects.length > 0
                ? Math.round(
                    subjects.reduce(
                        (sum, subject) => sum + getAttendancePercent(subject),
                        0
                    ) / subjects.length
                )
                : 0;

        const lowSubjects = getLowAttendanceSubjects(subjects, attendanceTarget);
        const warningSubjects = getWarningSubjects(subjects, attendanceTarget);
        const safeSubjects = getSafeSubjects(subjects, attendanceTarget);
        const criticalSubject = getCriticalSubject(subjects, attendanceTarget);

        const tone: Tone =
            lowSubjects.length > 0
                ? "red"
                : warningSubjects.length > 0
                    ? "orange"
                    : "green";

        return {
            average,
            lowSubjects,
            warningSubjects,
            safeSubjects,
            criticalSubject,
            tone,
        };
    }, [attendanceTarget, subjects]);

    const todaySchedule = useMemo(() => {
        if (timetableSlots.length > 0) {
            return buildTodayClassPreview(timetableSlots);
        }

        return demoTodayClasses.map(mapDemoClassToDashboardClass);
    }, [timetableSlots]);

    const nextClass =
        todaySchedule.find((item) => item.status === "ongoing") ??
        todaySchedule.find((item) => item.status === "upcoming") ??
        todaySchedule[0];

    const nextEvent = calendarEvents[0];

    const resultSummary = useMemo(() => {
        return getResultSummary({
            sgpa: session.results?.sgpa ?? null,
            semester: session.results?.semester ?? null,
            courses: resultCourses,
        });
    }, [resultCourses, session.results?.semester, session.results?.sgpa]);

    const latestSeating = useMemo(() => {
        return getLatestSeatingItem(seatingItems);
    }, [seatingItems]);

    return (
        <DashboardShell
            title="Dashboard"
            subtitle={`Welcome back, ${displayName}`}
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge={
                            source === "pesu"
                                ? "CampusFlow / PESU Live"
                                : "CampusFlow / Demo Preview"
                        }
                        title="Your academic"
                        mutedTitle="control room."
                        description="A clean overview of your PESU attendance, daily classes, results, seating, and academic shortcuts — refreshed through the server session."
                    >
                        <DashboardHeroCard
                            average={attendanceSummary.average}
                            target={attendanceTarget}
                            tone={attendanceSummary.tone}
                            source={source}
                            syncedAt={syncedAt}
                            usingDemoData={usingDemoData}
                            onRefresh={handleRefresh}
                        />
                    </StudioHero>
                </motion.div>

                {usingDemoData && (
                    <motion.section
                        variants={sectionMotion}
                        initial="initial"
                        animate="animate"
                        className="rounded-[2rem] border border-orange-300/20 bg-orange-300/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-orange-100">
                                    Real PESU data is not synced yet
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-orange-100/75">
                                    Connect PESUAcademy in Settings to sync attendance,
                                    timetable, results, and seating from the server session.
                                </p>
                            </div>

                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-100"
                            >
                                Sync PESU
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </motion.section>
                )}

                <motion.section
                    variants={staggerContainer(0.08)}
                    initial="initial"
                    animate="animate"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <MetricCard
                        label="Average Attendance"
                        value={`${attendanceSummary.average}%`}
                        detail={`Target ${attendanceTarget}% • ${subjects.length} subjects`}
                        icon={BarChart3}
                        tone={attendanceSummary.tone}
                    />

                    <MetricCard
                        label="Low Subjects"
                        value={attendanceSummary.lowSubjects.length}
                        detail={`Below ${attendanceTarget}% target`}
                        icon={AlertTriangle}
                        tone={attendanceSummary.lowSubjects.length > 0 ? "red" : "green"}
                    />

                    <MetricCard
                        label="Next Class"
                        value={displayValue(nextClass?.time?.split(" - ")[0])}
                        detail={displayValue(nextClass?.subject)}
                        icon={Clock3}
                        tone="blue"
                    />

                    <MetricCard
                        label="Latest SGPA"
                        value={
                            resultSummary.sgpa !== null
                                ? resultSummary.sgpa.toFixed(2)
                                : "-"
                        }
                        detail={
                            resultSummary.courseCount
                                ? `Sem ${resultSummary.semester ?? "-"} • ${resultSummary.courseCount} courses`
                                : "Results not synced"
                        }
                        icon={GraduationCap}
                        tone="violet"
                    />
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
                    <main className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Attendance Snapshot"
                                title="Subject Health"
                                href="/attendance"
                                action="Open Attendance"
                            />

                            <motion.div
                                variants={staggerContainer(0.075)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3"
                            >
                                {subjects
                                    .slice()
                                    .sort(
                                        (a, b) =>
                                            getAttendancePercent(a) -
                                            getAttendancePercent(b)
                                    )
                                    .slice(0, 6)
                                    .map((subject) => (
                                        <SubjectHealthRow
                                            key={subject.code}
                                            subject={subject}
                                            target={attendanceTarget}
                                        />
                                    ))}
                            </motion.div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Quick Access"
                                title="Workspace Shortcuts"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3 md:grid-cols-2"
                            >
                                {quickActions.map((action) => (
                                    <QuickActionCard key={action.href} action={action} />
                                ))}
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
                                        Critical Focus
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        {attendanceSummary.criticalSubject?.name ?? "All clear"}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {attendanceSummary.criticalSubject
                                            ? `${attendanceSummary.criticalSubject.code} • ${getAttendancePercent(
                                                attendanceSummary.criticalSubject
                                            )}% attendance`
                                            : "No subject needs urgent attention right now."}
                                    </p>
                                </div>

                                <StudioIconBubble
                                    icon={
                                        attendanceSummary.criticalSubject
                                            ? AlertTriangle
                                            : CheckCircle2
                                    }
                                    tone={
                                        attendanceSummary.criticalSubject
                                            ? attendanceSummary.tone
                                            : "green"
                                    }
                                />
                            </div>

                            {attendanceSummary.criticalSubject && (
                                <div className="mt-6">
                                    <StudioProgressBar
                                        value={getAttendancePercent(
                                            attendanceSummary.criticalSubject
                                        )}
                                        tone={toProgressTone(attendanceSummary.tone)}
                                    />
                                </div>
                            )}

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <StudioMini
                                    label="Average"
                                    value={`${attendanceSummary.average}%`}
                                />
                                <StudioMini label="Target" value={`${attendanceTarget}%`} />
                                <StudioMini
                                    label="Warning"
                                    value={attendanceSummary.warningSubjects.length}
                                />
                                <StudioMini label="Source" value={source.toUpperCase()} />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Today Preview
                            </h2>

                            <div className="mt-4 space-y-3">
                                <SideInfoRow
                                    icon={Timer}
                                    label={nextClass?.status === "ongoing" ? "Now" : "Next"}
                                    value={nextClass?.subject ?? "-"}
                                    detail={
                                        nextClass
                                            ? `${nextClass.time} • ${nextClass.room}`
                                            : "-"
                                    }
                                    tone="blue"
                                />

                                <SideInfoRow
                                    icon={GraduationCap}
                                    label="Latest Result"
                                    value={
                                        resultSummary.sgpa !== null
                                            ? `${resultSummary.sgpa.toFixed(2)} SGPA`
                                            : resultSummary.bestCourse?.grade
                                                ? `${resultSummary.bestCourse.grade} best grade`
                                                : "-"
                                    }
                                    detail={
                                        resultSummary.courseCount
                                            ? `Sem ${resultSummary.semester ?? "-"} • ${resultSummary.courseCount} courses`
                                            : "Results will appear after PESU sync"
                                    }
                                    tone="violet"
                                />

                                <SideInfoRow
                                    icon={MapPinned}
                                    label="Seating"
                                    value={
                                        latestSeating
                                            ? latestSeating.code ?? "Exam seating"
                                            : "No seating data"
                                    }
                                    detail={
                                        latestSeating
                                            ? `${latestSeating.date ?? "--"} • ${latestSeating.time ?? "--"} • ${latestSeating.block ?? "--"}`
                                            : "Seating will appear after release"
                                    }
                                    tone="green"
                                />

                                <SideInfoRow
                                    icon={CalendarDays}
                                    label="Academic Event"
                                    value={nextEvent?.title ?? "No event"}
                                    detail={
                                        nextEvent
                                            ? `${nextEvent.date} • ${nextEvent.type}`
                                            : "--"
                                    }
                                    tone="orange"
                                />

                                <SideInfoRow
                                    icon={RefreshCw}
                                    label="Last Sync"
                                    value={
                                        syncedAt
                                            ? new Date(syncedAt).toLocaleString()
                                            : "Not synced"
                                    }
                                    detail={source === "pesu" ? "PESU Academy" : "Demo preview"}
                                    tone={source === "pesu" ? "green" : "orange"}
                                />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Latest Updates
                            </h2>

                            <div className="mt-4 space-y-3">
                                {dashboardUpdates.map((update) => (
                                    <div
                                        key={`${update.title}-${update.time}`}
                                        className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4"
                                    >
                                        <p className="text-sm font-black text-slate-300">
                                            {update.title}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                            {update.detail}
                                        </p>

                                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
                                            {update.time}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

function DashboardHeroCard({
    average,
    target,
    tone,
    source,
    syncedAt,
    usingDemoData,
    onRefresh,
}: {
    average: number;
    target: number;
    tone: Tone;
    source: string;
    syncedAt: string;
    usingDemoData: boolean;
    onRefresh: () => void;
}) {
    return (
        <div className="studio-card-soft p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Attendance Health
                    </p>

                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-6xl font-black tracking-[-0.06em]">{average}</p>
                        <p className="mb-2 text-sm font-semibold text-slate-500">%</p>
                    </div>
                </div>

                <StudioIconBubble icon={LayoutDashboard} tone={tone} />
            </div>

            <div className="mt-5">
                <StudioProgressBar value={average} tone={toProgressTone(tone)} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <StudioMini label="Target" value={`${target}%`} />
                <StudioMini
                    label="Source"
                    value={usingDemoData ? "Demo" : source.toUpperCase()}
                />
            </div>

            <button
                onClick={onRefresh}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
            >
                <RefreshCw size={15} />
                Refresh Server Data
            </button>

            <p className="mt-3 text-xs leading-5 text-slate-500">
                {syncedAt
                    ? `Synced ${new Date(syncedAt).toLocaleString()}`
                    : "Connect PESUAcademy in Settings to refresh real data."}
            </p>
        </div>
    );
}

function SubjectHealthRow({
    subject,
    target,
}: {
    subject: AttendanceSubject;
    target: number;
}) {
    const percent = getAttendancePercent(subject);

    const tone: Tone =
        percent >= target ? "green" : percent >= target - 5 ? "orange" : "red";

    return (
        <motion.div
            variants={cardMotion}
            className="group relative overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
            <div
                className={`absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${toneGlow(
                    tone
                )}`}
            />

            <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        {subject.code}
                    </p>

                    <h3 className="mt-2 truncate font-black tracking-tight text-white">
                        {subject.name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {subject.attended}/{subject.total} classes attended
                    </p>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${toneChip(tone)}`}>
                            {percent}%
                        </span>

                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                            Target {target}%
                        </span>
                    </div>

                    <StudioProgressBar value={percent} tone={toProgressTone(tone)} />
                </div>
            </div>
        </motion.div>
    );
}

function QuickActionCard({
    action,
}: {
    action: {
        label: string;
        href: string;
        detail: string;
        icon: LucideIcon;
        tone: Tone;
    };
}) {
    const Icon = action.icon;

    return (
        <motion.div variants={cardMotion}>
            <Link
                href={action.href}
                className="group relative block overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.065]"
            >
                <div
                    className={`absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${toneGlow(
                        action.tone
                    )}`}
                />

                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneIcon(
                                action.tone
                            )}`}
                        >
                            <Icon size={19} />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-300">
                                {action.label}
                            </p>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                                {action.detail}
                            </p>
                        </div>
                    </div>

                    <ArrowUpRight
                        size={17}
                        className="shrink-0 text-slate-600 transition group-hover:text-white"
                    />
                </div>
            </Link>
        </motion.div>
    );
}

function SideInfoRow({
    icon,
    label,
    value,
    detail,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    detail: string;
    tone: Tone;
}) {
    const Icon = icon;

    return (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <div
                className={`absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${toneGlow(
                    tone
                )}`}
            />

            <div className="relative z-10 flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneIcon(
                        tone
                    )}`}
                >
                    <Icon size={18} />
                </div>

                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                        {label}
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-slate-300">
                        {value}
                    </p>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                        {detail}
                    </p>
                </div>
            </div>
        </div>
    );
}

function mapDemoClassToDashboardClass(
    item: (typeof demoTodayClasses)[number],
    index: number
): DashboardClass {
    const status =
        item.status === "ongoing" ||
            item.status === "upcoming" ||
            item.status === "completed"
            ? item.status
            : "upcoming";

    return {
        id: `demo-${item.subject}-${item.time}-${index}`,
        status,
        subject: item.subject,
        code: "-",
        time: item.time,
        room: item.room,
        day: "Today",
    };
}

function cleanUnavailableText(value?: string | null) {
    const clean = String(value ?? "").trim();

    if (
        !clean ||
        /^(?:-|n\/a|na|none|null|undefined|missing|not synced|not assigned|room not synced|room not assigned|no room assigned|faculty not synced|no faculty assigned)$/i.test(clean)
    ) {
        return "";
    }

    return clean;
}

function displayValue(value?: string | number | null) {
    const clean = cleanUnavailableText(value === undefined || value === null ? "" : String(value));

    return clean || "-";
}

function cleanRoom(room?: string | null, roomId?: string | null) {
    const clean = cleanUnavailableText(room);

    if (!clean) {
        return "-";
    }

    if (roomId && clean.toLowerCase() === `room ${roomId}`.toLowerCase()) {
        return "-";
    }

    return clean;
}

function buildTodayClassPreview(slots: DashboardTimetableSlot[]) {
    const today = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
    }).format(new Date());

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return slots
        .filter((slot) => slot.day === today)
        .map((slot, index) => {
            const start = parseClockMinutes(slot.startTime ?? slot.time?.split(" - ")[0] ?? "");
            const end = parseClockMinutes(slot.endTime ?? slot.time?.split(" - ")[1] ?? "");

            const status: DashboardClassStatus =
                start <= currentMinutes && currentMinutes <= end
                    ? "ongoing"
                    : currentMinutes < start
                        ? "upcoming"
                        : "completed";

            const subject = displayValue(
                cleanUnavailableText(slot.subject) || cleanUnavailableText(slot.code)
            );
            const code = displayValue(slot.code);
            const time = displayValue(
                cleanUnavailableText(slot.time) ||
                [slot.startTime, slot.endTime]
                    .map(cleanUnavailableText)
                    .filter(Boolean)
                    .join(" - ")
            );

            return {
                id: slot.id ?? `pesu-${code}-${time}-${index}`,
                status,
                subject,
                code,
                time,
                room: cleanRoom(slot.room, slot.roomId),
                day: slot.day ?? today,
            };
        })
        .sort((a, b) => {
            const aStart = parseClockMinutes(a.time.split(" - ")[0] ?? "");
            const bStart = parseClockMinutes(b.time.split(" - ")[0] ?? "");

            return aStart - bStart;
        });
}

function parseClockMinutes(value: string) {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
        return 0;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === "PM" && hour !== 12) {
        hour += 12;
    }

    if (meridiem === "AM" && hour === 12) {
        hour = 0;
    }

    return hour * 60 + minute;
}

function getResultSummary({
    sgpa,
    semester,
    courses,
}: {
    sgpa: number | null;
    semester: number | null;
    courses: DashboardResultCourse[];
}) {
    const gradedCourses = courses.filter((course) => course.grade);

    const sortedByGrade = gradedCourses
        .slice()
        .sort((a, b) => getGradeRank(b.grade) - getGradeRank(a.grade));

    return {
        sgpa,
        semester,
        courseCount: courses.length,
        bestCourse: sortedByGrade[0],
        weakestCourse: sortedByGrade[sortedByGrade.length - 1],
    };
}

function getGradeRank(grade?: string | null) {
    const normalized = (grade ?? "").toUpperCase().trim();

    const rank: Record<string, number> = {
        S: 10,
        A: 9,
        "A+": 9,
        B: 8,
        "B+": 8,
        C: 7,
        D: 6,
        E: 5,
        F: 0,
    };

    return rank[normalized] ?? -1;
}

function getLatestSeatingItem(items: DashboardSeatingItem[]) {
    if (!items.length) {
        return null;
    }

    return items
        .slice()
        .sort((a, b) => getSeatingTimestamp(b) - getSeatingTimestamp(a))[0];
}

function getSeatingTimestamp(item: DashboardSeatingItem) {
    const date = parsePESUDate(item.date ?? "");
    const time = parsePESUStartTime(item.time ?? "");

    if (!date) {
        return 0;
    }

    return new Date(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute
    ).getTime();
}

function parsePESUDate(value: string) {
    const match = value.trim().match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})$/);

    if (!match) {
        return null;
    }

    const monthMap: Record<string, number> = {
        jan: 0,
        january: 0,
        feb: 1,
        february: 1,
        mar: 2,
        march: 2,
        apr: 3,
        april: 3,
        may: 4,
        jun: 5,
        june: 5,
        jul: 6,
        july: 6,
        aug: 7,
        august: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        october: 9,
        nov: 10,
        november: 10,
        dec: 11,
        december: 11,
    };

    const day = Number(match[1]);
    const month = monthMap[match[2].toLowerCase()];
    const year = Number(match[3]);

    if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) {
        return null;
    }

    return { day, month, year };
}

function parsePESUStartTime(value: string) {
    const start = value.split(" - ")[0]?.trim() ?? "";
    const match = start.match(/^(\d{1,2})[-:](\d{2})\s*(AM|PM)$/i);

    if (!match) {
        return {
            hour: 0,
            minute: 0,
        };
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === "PM" && hour !== 12) {
        hour += 12;
    }

    if (meridiem === "AM" && hour === 12) {
        hour = 0;
    }

    return {
        hour,
        minute,
    };
}

function toProgressTone(tone: Tone): ProgressTone {
    if (tone === "green" || tone === "blue" || tone === "violet" || tone === "slate") {
        return "green";
    }

    if (tone === "orange") return "orange";

    return "red";
}

function toneGlow(tone: Tone) {
    const classes: Record<Tone, string> = {
        blue: "bg-sky-300/20",
        green: "bg-emerald-300/20",
        orange: "bg-orange-300/20",
        violet: "bg-[#795be6]/25",
        red: "bg-red-300/20",
        slate: "bg-white/[0.08]",
    };

    return classes[tone];
}

function toneIcon(tone: Tone) {
    const classes: Record<Tone, string> = {
        blue: "bg-sky-300/10 text-sky-200",
        green: "bg-emerald-300/10 text-emerald-200",
        orange: "bg-orange-300/10 text-orange-200",
        violet: "bg-[#795be6]/15 text-[#d7ceff]",
        red: "bg-red-300/10 text-red-200",
        slate: "bg-white/[0.055] text-slate-300",
    };

    return classes[tone];
}

function toneChip(tone: Tone) {
    const classes: Record<Tone, string> = {
        blue: "bg-sky-300/10 text-sky-200",
        green: "bg-emerald-300/10 text-emerald-200",
        orange: "bg-orange-300/10 text-orange-200",
        violet: "bg-[#795be6]/15 text-[#d7ceff]",
        red: "bg-red-300/10 text-red-200",
        slate: "bg-white/[0.055] text-slate-300",
    };

    return classes[tone];
}
