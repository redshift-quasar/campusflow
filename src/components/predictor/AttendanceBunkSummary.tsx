"use client";

import { motion } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    CalendarDays,
    CalendarX2,
    Clock3,
    ShieldCheck,
    TrendingDown,
    Umbrella,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { staggerContainer } from "@/lib/motion";

type AttendanceBunkSummaryProps = {
    currentAverage: number;
    predictedAverage: number;
    totalBunkDays: number;
    totalMissedClasses: number;
    safeCount: number;
    warningCount: number;
    dangerCount: number;
    unrecoverableCount: number;
    biggestDropSubject?: {
        name: string;
        drop: number;
    } | null;
    approximateMode: boolean;
    remainingWorkingDays: number;
    calendarModeLabel: string;
    totalEstimatedRemainingClasses: number;
};

export function AttendanceBunkSummary({
    currentAverage,
    predictedAverage,
    totalBunkDays,
    totalMissedClasses,
    safeCount,
    warningCount,
    dangerCount,
    unrecoverableCount,
    biggestDropSubject,
    approximateMode,
    remainingWorkingDays,
    calendarModeLabel,
    totalEstimatedRemainingClasses,
}: AttendanceBunkSummaryProps) {
    return (
        <section className="rounded-[1.8rem] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Global Prediction Summary
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                        Impact after selected bunk days
                    </h2>
                </div>

                {approximateMode && (
                    <span className="rounded-full bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-100">
                        Approximate prediction - timetable mapping is not available
                    </span>
                )}
            </div>

            {unrecoverableCount > 0 && (
                <div className="mt-4 rounded-[1.35rem] border border-red-300/25 bg-red-300/[0.08] px-4 py-3 text-sm font-black text-red-100">
                    Your bunk plan makes {unrecoverableCount} subject
                    {unrecoverableCount === 1 ? "" : "s"} unrecoverable.
                </div>
            )}

            <motion.div
                variants={staggerContainer(0.06)}
                initial="initial"
                animate="animate"
                className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            >
                <MetricCard
                    label="Current Avg"
                    value={`${currentAverage}%`}
                    detail="Before bunk plan"
                    icon={BarChart3}
                    tone="sky"
                />
                <MetricCard
                    label="Predicted Avg"
                    value={`${predictedAverage}%`}
                    detail="After selected bunk dates"
                    icon={TrendingDown}
                    tone={predictedAverage < currentAverage ? "orange" : "green"}
                />
                <MetricCard
                    label="Bunk Days"
                    value={totalBunkDays}
                    detail="Selected dates"
                    icon={CalendarX2}
                    tone="violet"
                />
                <MetricCard
                    label="Missed Classes"
                    value={totalMissedClasses}
                    detail="From selected dates"
                    icon={Umbrella}
                    tone={totalMissedClasses > 0 ? "red" : "slate"}
                />
                <MetricCard
                    label="Working Days"
                    value={remainingWorkingDays}
                    detail="Sundays and blocked dates excluded"
                    icon={CalendarDays}
                    tone="sky"
                />
                <MetricCard
                    label="Calendar"
                    value={calendarModeLabel}
                    detail={`${totalEstimatedRemainingClasses} estimated remaining classes`}
                    icon={Clock3}
                    tone="slate"
                />
                <MetricCard
                    label="Safe"
                    value={safeCount}
                    detail="After bunk plan"
                    icon={ShieldCheck}
                    tone="green"
                />
                <MetricCard
                    label="Warning"
                    value={warningCount}
                    detail="After bunk plan"
                    icon={AlertTriangle}
                    tone="orange"
                />
                <MetricCard
                    label="Danger"
                    value={dangerCount}
                    detail="After bunk plan"
                    icon={AlertTriangle}
                    tone={dangerCount > 0 ? "red" : "slate"}
                />
                <MetricCard
                    label="Unrecoverable"
                    value={unrecoverableCount}
                    detail="Needs more classes than remain"
                    icon={AlertTriangle}
                    tone={unrecoverableCount > 0 ? "red" : "slate"}
                />
                <MetricCard
                    label="Biggest Drop"
                    value={
                        biggestDropSubject
                            ? `${biggestDropSubject.drop}%`
                            : "0%"
                    }
                    detail={biggestDropSubject?.name ?? "No impact yet"}
                    icon={TrendingDown}
                    tone={biggestDropSubject?.drop ? "red" : "slate"}
                />
            </motion.div>
        </section>
    );
}
