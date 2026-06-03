"use client";

import { useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Award,
    BarChart3,
    BookOpen,
    GraduationCap,
    RefreshCw,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { usePesuResults } from "@/lib/hooks/use-pesu-results";
import type { SafePesuResultCourse } from "@/lib/pesu/campusflow-pesu";
import {
    getAverageResult,
    getGradeDistribution,
    getHighestResult,
    getLowestResult,
    getResultStatus,
    getResultStatusLabel,
    getResultTone,
    type ResultItem,
} from "@/lib/academic-utils";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioProgressBar,
    StudioSectionHeader,
} from "@/components/studio/Studio";

type Tone = "blue" | "green" | "orange" | "violet" | "red";

function displayValue(value?: string | number | null) {
    if (value === null || value === undefined) return "-";

    const text = String(value).trim();

    return text ? text : "-";
}

function displayFixed(value?: number | null) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";

    return value.toFixed(2);
}

function displayMarks(marks?: number | null, maxMarks?: number | null) {
    if (marks === null || marks === undefined) return "-";

    if (maxMarks === null || maxMarks === undefined) {
        return String(marks);
    }

    return `${marks}/${maxMarks}`;
}

function displayCreditPair(
    earnedCredits?: number | null,
    totalCredits?: number | null
) {
    if (
        (earnedCredits === null || earnedCredits === undefined) &&
        (totalCredits === null || totalCredits === undefined)
    ) {
        return "-";
    }

    return `${displayValue(earnedCredits)}/${displayValue(totalCredits)}`;
}

function ResultsContent() {
    const { user } = useLocalAuth();
    const {
        results: resultItems,
        courses: resultCourses,
        semesters,
        rawResults,
        source,
        error,
        usingDemoData,
    } = usePesuResults();

    const displayName = user?.name ?? user?.srn ?? "Student";

    const searchParams = useSearchParams();
    const codeParam = searchParams.get("code");

    useEffect(() => {
        if (codeParam) {
            const el = document.getElementById(`course-${codeParam}`);
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 150);
                return () => clearTimeout(timer);
            }
        }
    }, [codeParam]);

    const averageResult = getAverageResult(resultItems);
    const highestResult = getHighestResult(resultItems);
    const lowestResult = getLowestResult(resultItems);
    const gradeDistribution = getGradeDistribution(resultItems);
    const latestSemester = semesters.at(-1);

    const badgeText = useMemo(() => {
        if (source !== "pesu") return "CampusFlow / Demo Results";
        const type = rawResults?.resultType;
        if (type === "current") return "Current Semester";
        if (type === "released") return "Released Result";
        if (type === "previous") return "Previous Semester";
        return "Result Status Unknown";
    }, [source, rawResults]);

    return (
        <DashboardShell title="Results" subtitle={`Academic record for ${displayName}`}>
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge={badgeText}
                        title="Performance,"
                        mutedTitle="cleanly tracked."
                        description="Your marks, grade distribution, semester record, and strongest subjects are arranged in one premium academic overview."
                    >
                        <ResultHeroCard
                            average={averageResult}
                            sgpa={latestSemester?.sgpa ?? null}
                            cgpa={latestSemester?.cgpa ?? null}
                            earnedCredits={rawResults ? rawResults.earnedCredits : latestSemester?.credits}
                            totalCredits={rawResults?.totalCredits}
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
                        <h2 className="text-lg font-black text-orange-100">
                            Demo results are showing
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-orange-100/75">
                            {error
                                ? `PESU results are not available yet: ${error}`
                                : "PESU results are not available yet, so CampusFlow is keeping the demo fallback visible."}
                        </p>
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
                        value={averageResult !== null ? `${averageResult}%` : "-"}
                        detail="Across current subjects"
                        icon={BarChart3}
                        tone={averageResult !== null ? getResultTone(getResultStatus(averageResult)) : "slate"}
                    />

                    <MetricCard
                        label="Latest SGPA"
                        value={displayFixed(latestSemester?.sgpa)}
                        detail={displayValue(latestSemester?.semester)}
                        icon={GraduationCap}
                        tone="violet"
                    />

                    <MetricCard
                        label="Highest"
                        value={highestResult && highestResult.total !== null ? `${highestResult.total}%` : "-"}
                        detail={displayValue(highestResult?.subject)}
                        icon={TrendingUp}
                        tone="green"
                    />

                    <MetricCard
                        label="Lowest"
                        value={lowestResult && lowestResult.total !== null ? `${lowestResult.total}%` : "-"}
                        detail={displayValue(lowestResult?.subject)}
                        icon={TrendingDown}
                        tone={lowestResult && lowestResult.total !== null ? getResultTone(getResultStatus(lowestResult.total)) : "slate"}
                    />
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Subject Results"
                                title="Marks Overview"
                            />

                            <motion.div
                                variants={staggerContainer(0.075)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3"
                            >
                                {resultItems.map((result, index) => {
                                    const course = resultCourses[index] ?? resultCourses.find(
                                        (item) => item.code === result.code
                                    );

                                    return (
                                        <ResultSubjectCard
                                            key={`${result.code}-${result.subject}-${index}`}
                                            result={result}
                                            course={course}
                                            highlighted={result.code === codeParam}
                                        />
                                    );
                                })}
                            </motion.div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Semester Record"
                                title="SGPA / CGPA Timeline"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3 md:grid-cols-2"
                            >
                                {semesters.map((semester) => (
                                    <SemesterCard key={semester.semester} semester={semester} />
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
                                        Result Status
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        {averageResult !== null ? getResultStatusLabel(getResultStatus(averageResult)) : "-"}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Based on your current average result.
                                    </p>
                                </div>

                                <StudioIconBubble
                                    icon={ShieldCheck}
                                    tone={averageResult !== null ? getResultTone(getResultStatus(averageResult)) : "slate"}
                                />
                            </div>

                            <div className="mt-6">
                                {averageResult !== null ? (
                                    <StudioProgressBar
                                        value={averageResult}
                                        tone={resultToneToProgressTone(
                                            getResultTone(getResultStatus(averageResult))
                                        )}
                                    />
                                ) : (
                                    <div className="h-2 w-full rounded-full bg-white/[0.06]" />
                                )}
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <StudioMini label="Average" value={averageResult !== null ? `${averageResult}%` : "-"} />
                                <StudioMini
                                    label="Subjects"
                                    value={String(resultItems.length)}
                                />
                                <StudioMini
                                    label="CGPA"
                                    value={displayFixed(latestSemester?.cgpa)}
                                    wide
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
                                Grade Distribution
                            </h2>

                            <div className="mt-4 space-y-3">
                                {Object.entries(gradeDistribution).map(([grade, count]) => (
                                    <GradeDistributionRow
                                        key={grade}
                                        grade={grade}
                                        count={count}
                                        total={resultItems.length}
                                    />
                                ))}
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Quick Summary
                            </h2>

                            <div className="mt-4 space-y-3">
                                <SummaryRow
                                    icon={Trophy}
                                    label="Best Subject"
                                    value={displayValue(highestResult?.subject)}
                                    tone="green"
                                />

                                <SummaryRow
                                    icon={BookOpen}
                                    label="Focus Subject"
                                    value={displayValue(lowestResult?.subject)}
                                    tone="orange"
                                />

                                <SummaryRow
                                    icon={Award}
                                    label="Credits"
                                    value={
                                        rawResults
                                            ? displayCreditPair(rawResults.earnedCredits, rawResults.totalCredits)
                                            : displayValue(latestSemester?.credits)
                                    }
                                    tone="violet"
                                />
                            </div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={
            <DashboardShell title="Results" subtitle="Loading academic record...">
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
                        <p className="text-sm font-semibold text-slate-500">Loading results...</p>
                    </div>
                </div>
            </DashboardShell>
        }>
            <ResultsContent />
        </Suspense>
    );
}

function ResultHeroCard({
    average,
    sgpa,
    cgpa,
    earnedCredits,
    totalCredits,
}: {
    average: number | null;
    sgpa: number | null;
    cgpa: number | null;
    earnedCredits?: number | null;
    totalCredits?: number | null;
}) {
    const status = average !== null ? getResultStatus(average) : "low";
    const tone = average !== null ? getResultTone(status) : "slate";

    return (
        <div className="studio-card-soft p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Academic Score
                    </p>

                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-6xl font-black tracking-[-0.06em]">
                            {average !== null ? average : "-"}
                        </p>

                        {average !== null && <p className="mb-2 text-sm font-semibold text-slate-500">%</p>}
                    </div>
                </div>

                <StudioIconBubble icon={BarChart3} tone={tone} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <StudioMini label="SGPA" value={displayFixed(sgpa)} />
                <StudioMini label="CGPA" value={displayFixed(cgpa)} />
                <StudioMini
                    label="Credits"
                    value={displayCreditPair(earnedCredits, totalCredits)}
                    wide
                />
            </div>

            <div className="mt-5">
                {average !== null ? (
                    <StudioProgressBar value={average} tone={resultToneToProgressTone(tone)} />
                ) : (
                    <div className="h-2 w-full rounded-full bg-white/[0.06]" />
                )}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
                Status: {average !== null ? getResultStatusLabel(status) : "-"}
            </p>
        </div>
    );
}

function ResultSubjectCard({
    result,
    course,
    highlighted,
}: {
    result: ResultItem;
    course?: SafePesuResultCourse;
    highlighted?: boolean;
}) {
    const status = result.total !== null ? getResultStatus(result.total) : "low";
    const tone = result.total !== null ? getResultTone(status) : "slate";
    const toneClasses = getToneClasses(tone);

    return (
        <motion.div
            id={`course-${result.code}`}
            variants={cardMotion}
            className={`group relative overflow-hidden rounded-[1.45rem] border p-4 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06] ${
                highlighted
                    ? tone === "green"
                        ? "border-emerald-500/50 bg-emerald-500/[0.08] ring-2 ring-emerald-500/20"
                        : tone === "blue"
                        ? "border-sky-500/50 bg-sky-500/[0.08] ring-2 ring-sky-500/20"
                        : tone === "orange"
                        ? "border-orange-500/50 bg-orange-500/[0.08] ring-2 ring-orange-500/20"
                        : tone === "red"
                        ? "border-red-500/50 bg-red-500/[0.08] ring-2 ring-red-500/20"
                        : "border-violet-500/50 bg-violet-500/[0.08] ring-2 ring-violet-500/20"
                    : "border-white/[0.07] bg-white/[0.035]"
            }`}
        >
            <div
                className={`absolute -right-14 -top-14 h-32 w-32 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${toneClasses.glow}`}
            />

            <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        {displayValue(result.code)}
                    </p>

                    <h3 className="mt-2 truncate font-black tracking-tight text-white">
                        {displayValue(result.subject)}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        Grade {displayValue(result.grade)} • {displayValue(result.credits)} credits
                    </p>
                </div>

                <div>
                    <div className="flex items-center justify-between gap-3">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${toneClasses.chip}`}
                        >
                            {result.total !== null ? getResultStatusLabel(status) : "-"}
                        </span>

                        <span className="text-xl font-black tracking-[-0.04em] text-white">
                            {result.total !== null ? `${result.total}%` : "-"}
                        </span>
                    </div>

                    <div className="mt-3">
                        {result.total !== null ? (
                            <StudioProgressBar
                                value={result.total}
                                tone={resultToneToProgressTone(tone)}
                            />
                        ) : (
                            <div className="h-2 w-full rounded-full bg-white/[0.06]" />
                        )}
                    </div>
                </div>
            </div>

            {course?.assessments.length ? (
                <div className="relative z-10 mt-4 grid gap-2 md:grid-cols-2">
                    {course.assessments.map((assessment, index) => (
                        <div
                            key={`${result.code}-${assessment.name}-${index}`}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.035] px-3 py-2"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                                {displayValue(assessment.name)}
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-300">
                                {displayMarks(assessment.marks, assessment.maxMarks)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}
        </motion.div>
    );
}

function SemesterCard({
    semester,
}: {
    semester: {
        semester: string;
        sgpa: number | null;
        cgpa: number | null;
        credits: number | null;
    };
}) {
    return (
        <motion.div
            variants={cardMotion}
            className="group relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.06]"
        >
            <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#795be6]/20 blur-3xl transition duration-500 group-hover:scale-125" />

            <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                    {displayValue(semester.semester)}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniResult label="SGPA" value={displayFixed(semester.sgpa)} />
                    <MiniResult label="CGPA" value={displayFixed(semester.cgpa)} />
                    <MiniResult label="Credits" value={displayValue(semester.credits)} />
                </div>
            </div>
        </motion.div>
    );
}

function GradeDistributionRow({
    grade,
    count,
    total,
}: {
    grade: string;
    count: number;
    total: number;
}) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-white">Grade {displayValue(grade)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {count} subject{count === 1 ? "" : "s"}
                    </p>
                </div>

                <p className="text-sm font-black text-slate-300">{percent}%</p>
            </div>

            <div className="mt-3">
                <StudioProgressBar value={percent} tone="green" />
            </div>
        </div>
    );
}

function SummaryRow({
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
    const toneClasses = getToneClasses(tone);

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

function MiniResult({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-white/[0.045] px-3 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>

            <p className="mt-1 text-sm font-black text-slate-300">{value}</p>
        </div>
    );
}

function resultToneToProgressTone(tone: string) {
    if (tone === "green" || tone === "blue") return "green";
    if (tone === "orange") return "orange";

    return "red";
}

function getToneClasses(tone: Tone | string) {
    const toneClasses = {
        blue: {
            glow: "bg-sky-300/20",
            icon: "bg-sky-300/10 text-sky-200",
            chip: "bg-sky-300/10 text-sky-200",
        },
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
        violet: {
            glow: "bg-[#795be6]/25",
            icon: "bg-[#795be6]/15 text-[#d7ceff]",
            chip: "bg-[#795be6]/15 text-[#d7ceff]",
        },
        red: {
            glow: "bg-red-300/20",
            icon: "bg-red-300/10 text-red-200",
            chip: "bg-red-300/10 text-red-200",
        },
    };

    return toneClasses[tone as Tone] ?? toneClasses.violet;
}
