import {
    clampPercent,
    getAttendancePercent,
    getRemainingSkips,
    getRequiredClassesToReachTarget,
    simulateAttendanceScenario,
} from "@/lib/academic-utils";
import type { PredictorAttendanceSubject } from "@/lib/attendance-predictor";

export type PredictorRiskTone =
    | "safe"
    | "watch"
    | "risk"
    | "critical"
    | "manual";

export function calculatePercentage(attended: number, total: number) {
    return getAttendancePercent(attended, total);
}

export function getClassesNeededForTarget(
    attended: number,
    total: number,
    target: number
) {
    return getRequiredClassesToReachTarget(attended, total, target);
}

export function getBunkableClasses(
    attended: number,
    total: number,
    target: number,
    remainingClasses?: number
) {
    const bunkable = getRemainingSkips(attended, total, target);

    if (remainingClasses === undefined) return bunkable;

    return Math.min(bunkable, Math.max(0, Math.floor(remainingClasses)));
}

export function simulateSubjectAttendance(
    subject: PredictorAttendanceSubject,
    plannedAttend: number,
    plannedBunk: number
) {
    return simulateAttendanceScenario(
        subject.attended,
        subject.total,
        plannedAttend,
        plannedBunk
    );
}

export function buildRemainingClassEstimate(
    subjects: PredictorAttendanceSubject[],
    remainingWorkingDays: number,
    classesPerWorkingDay = 1
) {
    const safeDays = Math.max(0, Math.floor(remainingWorkingDays));
    const safeClassesPerDay = Math.max(0, Math.floor(classesPerWorkingDay));

    return subjects.map((subject) => ({
        ...subject,
        remainingClasses:
            subject.remainingClasses ?? safeDays * safeClassesPerDay,
    }));
}

export function getRiskTone(
    percent: number,
    target: number,
    totalClasses = 1
): PredictorRiskTone {
    const safePercent = clampPercent(percent);
    const safeTarget = clampPercent(target);

    if (totalClasses <= 0) return "manual";
    if (safePercent >= safeTarget) return "safe";
    if (safePercent >= safeTarget - 5) return "watch";
    if (safePercent >= safeTarget - 10) return "risk";

    return "critical";
}
