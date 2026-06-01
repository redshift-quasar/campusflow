"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    RefreshCw,
    ShieldCheck,
    Target,
    TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { useSettingsStore } from "@/lib/store/settings-store";
import { calendarEvents, timetable } from "@/lib/demo-data";
import {
    estimateSubjectInstructionalClassesBySemesterEnd,
    getAttendancePercent,
    getAttendanceTone,
    getCriticalSubject,
    getLowAttendanceSubjects,
    getProjectedAttendanceAdvice,
    getSafeSubjects,
    getWarningSubjects,
    type AttendanceSubject,
    type ProgressTone,
} from "@/lib/academic-utils";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioProgressBar,
    StudioSectionHeader,
} from "@/components/studio/Studio";

type Tone = "blue" | "green" | "orange" | "violet" | "red" | "slate";

export default function AttendancePage() {
    const { user } = useLocalAuth();

    const displayName = user?.name ?? user?.srn ?? "Student";

    const attendanceTarget = useSettingsStore((state) => state.attendanceTarget);
    const semesterStartDate = useSettingsStore((state) => state.semesterStartDate);
    const semesterEndDate = useSettingsStore((state) => state.semesterEndDate);

    const {
        subjects,
        syncedAt,
        source,
        syncAttendance,
        resetAttendanceCache,
        usingDemoData,
    } = usePesuAttendance();

    const excludedDates = useMemo(
        () =>
            calendarEvents
                .filter(
                    (event) =>
                        event.type === "holiday" ||
                        event.type === "exam" ||
                        event.type === "vacation"
                )
                .map((event) => event.date),
        []
    );

    const subjectsWithPrediction = useMemo(() => {
        return subjects
            .map((subject) => {
                const remainingClasses = estimateSubjectInstructionalClassesBySemesterEnd({
                    subject,
                    timetable,
                    semesterStartDate,
                    semesterEndDate,
                    excludedDates,
                });

                const advice = getProjectedAttendanceAdvice(
                    subject,
                    attendanceTarget,
                    remainingClasses
                );

                return {
                    subject,
                    remainingClasses,
                    advice,
                    percent: getAttendancePercent(subject),
                    tone: getAttendanceTone(subject, attendanceTarget),
                };
            })
            .sort((a, b) => a.percent - b.percent);
    }, [
        attendanceTarget,
        excludedDates,
        semesterEndDate,
        semesterStartDate,
        subjects,
    ]);

    const lowSubjects = getLowAttendanceSubjects(subjects, attendanceTarget);
    const warningSubjects = getWarningSubjects(subjects, attendanceTarget);
    const safeSubjects = getSafeSubjects(subjects, attendanceTarget);
    const criticalSubject = getCriticalSubject(subjects, attendanceTarget);

    const averageAttendance =
        subjects.length > 0
            ? Math.round(
                subjects.reduce((sum, subject) => sum + getAttendancePercent(subject), 0) /
                subjects.length
            )
            : 0;

    const statusTone: Tone =
        lowSubjects.length > 0
            ? "red"
            : warningSubjects.length > 0
                ? "orange"
                : "green";

    return (
        <DashboardShell
            title="Attendance"
            subtitle={`Real PESU attendance for ${displayName}`}
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge={source === "pesu" ? "CampusFlow / PESU Live" : "CampusFlow / Demo Preview"}
                        title="Attendance,"
                        mutedTitle="decoded clearly."
                        description="Track subject-wise attendance, danger subjects, recovery classes, safe skips, and semester-end projection from one clean workspace."
                    >
                        <AttendanceHeroCard
                            average={averageAttendance}
                            target={attendanceTarget}
                            source={source}
                            syncedAt={syncedAt}
                            lowCount={lowSubjects.length}
                            onRefresh={syncAttendance}
                            onReset={resetAttendanceCache}
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
                                    Demo attendance is showing
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-orange-100/75">
                                    Login from the home page with your PESU credentials to sync real
                                    profile, courses, and attendance. Password is not stored.
                                </p>
                            </div>

                            <button
                                onClick={syncAttendance}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-100"
                            >
                                <RefreshCw size={16} />
                                Check Cache
                            </button>
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
                        label="Average"
                        value={`${averageAttendance}%`}
                        detail={`Across ${subjects.length} subjects`}
                        icon={BarChart3}
                        tone={statusTone}
                    />

                    <MetricCard
                        label="Target"
                        value={`${attendanceTarget}%`}
                        detail="Minimum attendance goal"
                        icon={Target}
                        tone="violet"
                    />

                    <MetricCard
                        label="Low Subjects"
                        value={lowSubjects.length}
                        detail={`Below ${attendanceTarget}% target`}
                        icon={AlertTriangle}
                        tone={lowSubjects.length > 0 ? "red" : "green"}
                    />

                    <MetricCard
                        label="Safe Subjects"
                        value={safeSubjects.length}
                        detail="Currently above target"
                        icon={ShieldCheck}
                        tone="green"
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
                                eyebrow="Subject Analysis"
                                title="Attendance Breakdown"
                            />

                            <motion.div
                                variants={staggerContainer(0.075)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3"
                            >
                                {subjectsWithPrediction.map((item) => (
                                    <AttendanceSubjectCard
                                        key={item.subject.code}
                                        subject={item.subject}
                                        target={attendanceTarget}
                                        remainingClasses={item.remainingClasses}
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
                                eyebrow="Recovery Plan"
                                title="Subjects Needing Focus"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3 md:grid-cols-2"
                            >
                                {lowSubjects.length > 0 ? (
                                    lowSubjects.map((subject) => (
                                        <FocusSubjectCard
                                            key={subject.code}
                                            subject={subject}
                                            target={attendanceTarget}
                                        />
                                    ))
                                ) : (
                                    <motion.div
                                        variants={cardMotion}
                                        className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-5 md:col-span-2"
                                    >
                                        <div className="flex items-start gap-3">
                                            <StudioIconBubble icon={CheckCircle2} tone="green" />

                                            <div>
                                                <h3 className="text-lg font-black text-emerald-100">
                                                    All subjects are above target
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                                                    You are currently safe. Keep checking after every PESU
                                                    sync.
                                                </p>
                                            </div>
                                        </div>
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
                                        Critical Subject
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        {criticalSubject?.name ?? "No subject"}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {criticalSubject
                                            ? `${criticalSubject.code} • ${getAttendancePercent(
                                                criticalSubject
                                            )}% attendance`
                                            : "No attendance data available."}
                                    </p>
                                </div>

                                <StudioIconBubble
                                    icon={criticalSubject ? AlertTriangle : ShieldCheck}
                                    tone={criticalSubject ? "orange" : "green"}
                                />
                            </div>

                            {criticalSubject && (
                                <div className="mt-6">
                                    <StudioProgressBar
                                        value={getAttendancePercent(criticalSubject)}
                                        tone={progressToneFromSubject(
                                            criticalSubject,
                                            attendanceTarget
                                        )}
                                    />
                                </div>
                            )}

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <StudioMini label="Low" value={lowSubjects.length} />
                                <StudioMini label="Warning" value={warningSubjects.length} />
                                <StudioMini label="Safe" value={safeSubjects.length} />
                                <StudioMini label="Total" value={subjects.length} />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">Sync Status</h2>

                            <div className="mt-4 space-y-3">
                                <InfoPill
                                    icon={source === "pesu" ? CheckCircle2 : AlertTriangle}
                                    label="Source"
                                    value={source === "pesu" ? "PESU Academy" : "Demo Data"}
                                    tone={source === "pesu" ? "green" : "orange"}
                                />

                                <InfoPill
                                    icon={Clock3}
                                    label="Last Sync"
                                    value={
                                        syncedAt
                                            ? new Date(syncedAt).toLocaleString()
                                            : "Not synced yet"
                                    }
                                    tone="blue"
                                />

                                <InfoPill
                                    icon={CalendarDays}
                                    label="Semester Window"
                                    value={
                                        semesterEndDate
                                            ? `${semesterStartDate || "Today"} → ${semesterEndDate}`
                                            : "Set in Settings"
                                    }
                                    tone="violet"
                                />
                            </div>

                            <button
                                onClick={syncAttendance}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff]"
                            >
                                <RefreshCw size={16} />
                                Refresh Local Cache
                            </button>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Attendance Notes
                            </h2>

                            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
                                <p>
                                    PESU password is used only during login sync and is not saved.
                                </p>

                                <p>
                                    Semester-end predictions use your timetable + excluded academic
                                    dates when available.
                                </p>

                                <p>
                                    For fresh PESU data, logout and login again so the app can
                                    securely call PESU Academy with your password.
                                </p>
                            </div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

function AttendanceHeroCard({
    average,
    target,
    source,
    syncedAt,
    lowCount,
    onRefresh,
    onReset,
}: {
    average: number;
    target: number;
    source: string;
    syncedAt: string;
    lowCount: number;
    onRefresh: () => void;
    onReset: () => void;
}) {
    const tone: Tone = average >= target ? "green" : average >= target - 5 ? "orange" : "red";

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

                <StudioIconBubble icon={TrendingUp} tone={tone} />
            </div>

            <div className="mt-5">
                <StudioProgressBar value={average} tone={toneToProgress(tone)} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <StudioMini label="Target" value={`${target}%`} />
                <StudioMini label="Low" value={lowCount} />
            </div>

            <div className="mt-5 flex gap-2">
                <button
                    onClick={onRefresh}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
                >
                    <RefreshCw size={15} />
                    Refresh
                </button>

                <button
                    onClick={onReset}
                    className="inline-flex items-center justify-center rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                    Reset
                </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
                {source === "pesu"
                    ? `Synced ${syncedAt ? new Date(syncedAt).toLocaleString() : "recently"}`
                    : "Showing fallback demo data"}
            </p>
        </div>
    );
}

function AttendanceSubjectCard({
    subject,
    target,
    remainingClasses,
}: {
    subject: AttendanceSubject;
    target: number;
    remainingClasses: number;
}) {
    const percent = getAttendancePercent(subject);
    const tone = getAttendanceTone(subject, target);
    const progressTone = tone === "safe" ? "green" : tone === "warning" ? "orange" : "red";
    const advice = getProjectedAttendanceAdvice(subject, target, remainingClasses);
    const toneClasses = getToneClasses(progressTone);

    return (
        <motion.div
            variants={cardMotion}
            className="group relative overflow-hidden rounded-[1.55rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
            <div
                className={`absolute -right-14 -top-14 h-32 w-32 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${toneClasses.glow}`}
            />

            <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            {subject.code}
                        </p>

                        <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${toneClasses.chip}`}
                        >
                            {tone}
                        </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 font-black tracking-tight text-white">
                        {subject.name}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {subject.attended}/{subject.total} classes attended
                    </p>

                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                        {advice.message}
                    </p>
                </div>

                <div>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-3xl font-black tracking-[-0.05em] text-white">
                            {percent}%
                        </p>

                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                            Target {target}%
                        </p>
                    </div>

                    <div className="mt-3">
                        <StudioProgressBar value={percent} tone={progressTone} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniBox label="Need" value={advice.classesNeeded} />
                        <MiniBox label="Skips" value={advice.remainingSkips} />
                        <MiniBox label="Left" value={advice.remainingClasses} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function FocusSubjectCard({
    subject,
    target,
}: {
    subject: AttendanceSubject;
    target: number;
}) {
    const percent = getAttendancePercent(subject);
    const classesNeeded =
        getProjectedAttendanceAdvice(subject, target).classesNeeded;

    return (
        <motion.div
            variants={cardMotion}
            className="relative overflow-hidden rounded-[1.5rem] border border-red-300/20 bg-red-300/[0.07] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl"
        >
            <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-red-300/20 blur-3xl" />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100/50">
                            {subject.code}
                        </p>

                        <h3 className="mt-2 line-clamp-2 font-black text-red-50">
                            {subject.name}
                        </h3>
                    </div>

                    <span className="rounded-full bg-red-300/10 px-3 py-1 text-xs font-black text-red-100">
                        {percent}%
                    </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-red-100/75">
                    Attend next {classesNeeded} class{classesNeeded === 1 ? "" : "es"} to
                    recover towards {target}%.
                </p>
            </div>
        </motion.div>
    );
}

function InfoPill({
    icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: Tone;
}) {
    const Icon = icon;
    const toneClasses = getToneClasses(toneToProgress(tone));

    return (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <div
                className={`absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${toneClasses.glow}`}
            />

            <div className="relative z-10 flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses.icon}`}
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
                </div>
            </div>
        </div>
    );
}

function MiniBox({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-2xl bg-white/[0.045] px-3 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>

            <p className="mt-1 text-sm font-black text-slate-300">{value}</p>
        </div>
    );
}

function progressToneFromSubject(
    subject: AttendanceSubject,
    target: number
): ProgressTone {
    const tone = getAttendanceTone(subject, target);

    if (tone === "safe") return "green";
    if (tone === "warning") return "orange";

    return "red";
}

function toneToProgress(tone: Tone): ProgressTone {
    if (tone === "green" || tone === "blue" || tone === "violet" || tone === "slate") {
        return "green";
    }

    if (tone === "orange") return "orange";

    return "red";
}

function getToneClasses(tone: ProgressTone) {
    const toneClasses = {
        green: {
            glow: "bg-emerald-300/20",
            icon: "bg-emerald-300/10 text-emerald-200",
            chip: "bg-emerald-300/10 text-emerald-200",
        },
        orange: {
            glow: "bg-orange-300/20",
            icon: "bg-orange-300/10 text-orange-200",
            chip: "bg-orange-300/10 text-orange-200",
        },
        red: {
            glow: "bg-red-300/20",
            icon: "bg-red-300/10 text-red-200",
            chip: "bg-red-300/10 text-red-200",
        },
    };

    return toneClasses[tone];
}