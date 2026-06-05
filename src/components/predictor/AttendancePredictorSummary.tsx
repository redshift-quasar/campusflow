"use client";

import { motion } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    ShieldCheck,
    Target,
    TrendingUp,
    Umbrella,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { staggerContainer } from "@/lib/motion";

type AttendancePredictorSummaryProps = {
    average: number;
    subjectCount: number;
    safeCount: number;
    warningCount: number;
    dangerCount: number;
    totalSkips: number;
    totalNeeded: number;
    target: number;
    lowestSubject?: {
        name: string;
        percent: number;
    } | null;
};

export function AttendancePredictorSummary({
    average,
    subjectCount,
    safeCount,
    warningCount,
    dangerCount,
    totalSkips,
    totalNeeded,
    target,
    lowestSubject,
}: AttendancePredictorSummaryProps) {
    const averageTone =
        average >= target ? "green" : average >= target - 5 ? "orange" : "red";

    return (
        <motion.section
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
            <MetricCard
                label="Average"
                value={`${average}%`}
                detail={`Across ${subjectCount} manual subjects`}
                icon={BarChart3}
                tone={averageTone}
            />

            <MetricCard
                label="Safe"
                value={safeCount}
                detail={`At or above ${target}%`}
                icon={ShieldCheck}
                tone="green"
            />

            <MetricCard
                label="Warning"
                value={warningCount}
                detail={`Within 5% of ${target}%`}
                icon={AlertTriangle}
                tone="orange"
            />

            <MetricCard
                label="Danger"
                value={dangerCount}
                detail={`More than 5% below ${target}%`}
                icon={TrendingUp}
                tone={dangerCount > 0 ? "red" : "slate"}
            />

            <MetricCard
                label="Bunkable"
                value={totalSkips}
                detail="Total safe skips available"
                icon={Umbrella}
                tone="sky"
            />

            <MetricCard
                label="Needed"
                value={totalNeeded}
                detail="Classes weak subjects need"
                icon={Target}
                tone={totalNeeded > 0 ? "red" : "green"}
            />

            <MetricCard
                label="Lowest"
                value={lowestSubject ? `${lowestSubject.percent}%` : "-"}
                detail={lowestSubject?.name ?? "No live subject"}
                icon={AlertTriangle}
                tone={
                    lowestSubject && lowestSubject.percent < target
                        ? "red"
                        : "slate"
                }
            />
        </motion.section>
    );
}
