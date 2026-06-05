export type AttendanceSubject = {
    code: string;
    name: string;
    faculty?: string;
    attended: number;
    total: number;
    credits?: number;
    color?: string;
};

export type AttendancePredictorSubject = {
    id: string;
    name: string;
    code?: string;
    attended: number;
    total: number;
    remainingClasses?: number;
};

export type AttendanceTone = "safe" | "warning" | "danger";
export type ProgressTone = "green" | "orange" | "red";

export type ResultItem = {
    code: string;
    subject: string;
    total: number | null;
    grade: string | null;
    credits?: number | null;
};

export type ResultStatus = "excellent" | "good" | "average" | "low";

export type ProjectedAttendanceAdvice = {
    percent: number;
    tone: AttendanceTone;
    progressTone: ProgressTone;
    remainingClasses: number;
    projectedIfAttendAll: number;
    projectedIfSkipAll: number;
    classesNeeded: number;
    remainingSkips: number;
    impossible: boolean;
    message: string;
};

export type AttendancePlan = {
    percent: number;
    status: AttendanceTone;
    progressTone: ProgressTone;
    classesNeeded: number;
    remainingSkips: number;
    remainingClasses: number;
    projectedIfAttendAll: number;
    projectedIfSkipAll: number;
    isRecoverable: boolean;
    headline: string;
    advice: string;
};

export type AttendanceScenario = {
    attended: number;
    total: number;
    percent: number;
};

export type AttendancePredictorPlan = {
    percent: number;
    status: AttendanceTone;
    classesNeeded: number;
    remainingSkips: number;
    projectedIfAttendAll: number;
    projectedIfSkipAll: number;
    isRecoverable: boolean;
    headline: string;
    advice: string;
};

export type InstructionalEstimateInput = {
    subject: AttendanceSubject;
    timetable?: {
        subject?: string;
        code?: string;
        day?: string;
        time?: string;
    }[];
    semesterStartDate?: string;
    semesterEndDate?: string;
    excludedDates?: string[];
};

const DAY_INDEX: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
};

export function normalizeSearch(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\s_.\/-]+/g, "")
        .replace(/[^a-z0-9]/g, "");
}

export function clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;

    return Math.min(max, Math.max(min, value));
}

function safeClassCount(value: number) {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;

    return Math.max(0, Math.floor(value));
}

export function clampPercent(value: number) {
    return Number(clampNumber(value, 0, 100).toFixed(2));
}

export function getAttendancePercent(subject: AttendanceSubject): number;
export function getAttendancePercent(attended: number, total: number): number;
export function getAttendancePercent(
    subjectOrAttended: AttendanceSubject | number,
    total?: number
) {
    const attended =
        typeof subjectOrAttended === "number"
            ? subjectOrAttended
            : subjectOrAttended.attended;
    const classTotal =
        typeof subjectOrAttended === "number" ? total ?? 0 : subjectOrAttended.total;

    if (!classTotal || classTotal <= 0) return 0;

    const percent = (attended / classTotal) * 100;

    return clampPercent(percent);
}

export function getExactAttendancePercent(subject: AttendanceSubject) {
    return getAttendancePercent(subject);
}

export function getAttendanceTone(
    percentOrSubject: number | AttendanceSubject,
    target = 75
): AttendanceTone {
    const percent =
        typeof percentOrSubject === "number"
            ? percentOrSubject
            : getAttendancePercent(percentOrSubject);

    if (percent >= target) return "safe";
    if (percent >= target - 5) return "warning";

    return "danger";
}

export function getProgressTone(tone: AttendanceTone): ProgressTone {
    if (tone === "safe") return "green";
    if (tone === "warning") return "orange";

    return "red";
}

export function sortSubjectsByAttendance(subjects: AttendanceSubject[]) {
    return subjects
        .slice()
        .sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b));
}

export function getLowAttendanceSubjects(
    subjects: AttendanceSubject[],
    target = 75
) {
    return subjects
        .filter((subject) => getAttendancePercent(subject) < target)
        .sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b));
}

export function getWarningSubjects(subjects: AttendanceSubject[], target = 75) {
    return subjects
        .filter((subject) => {
            const percent = getAttendancePercent(subject);

            return percent < target && percent >= target - 5;
        })
        .sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b));
}

export function getSafeSubjects(subjects: AttendanceSubject[], target = 75) {
    return subjects
        .filter((subject) => getAttendancePercent(subject) >= target)
        .sort((a, b) => getAttendancePercent(b) - getAttendancePercent(a));
}

export function getCriticalSubject(
    subjects: AttendanceSubject[],
    target = 75
) {
    const lowSubjects = getLowAttendanceSubjects(subjects, target);

    return lowSubjects[0] ?? sortSubjectsByAttendance(subjects)[0] ?? null;
}

export function getRequiredClassesToReachTarget(
    attended: number,
    total: number,
    target = 75
) {
    const safeAttended = safeClassCount(attended);
    const safeTotal = Math.max(safeClassCount(total), safeAttended);
    const safeTarget = clampNumber(target, 0, 100);
    const targetRatio = safeTarget / 100;

    if (targetRatio <= 0) return 0;
    if (safeTotal <= 0) return 1;

    const currentPercent = safeTotal > 0 ? (safeAttended / safeTotal) * 100 : 0;

    if (currentPercent >= safeTarget) return 0;

    if (targetRatio >= 1) {
        return 0;
    }

    const required = (targetRatio * safeTotal - safeAttended) / (1 - targetRatio);

    return Math.max(0, Math.ceil(required));
}

export function getRemainingSkips(
    attended: number,
    total: number,
    target = 75
) {
    const safeAttended = safeClassCount(attended);
    const safeTotal = Math.max(safeClassCount(total), safeAttended);
    const safeTarget = clampNumber(target, 0, 100);
    const targetRatio = safeTarget / 100;

    if (targetRatio <= 0) return safeTotal;
    if (targetRatio >= 1) return 0;

    if (getAttendancePercent(safeAttended, safeTotal) < safeTarget) return 0;

    const allowedTotal = safeAttended / targetRatio;
    const skips = Math.floor(allowedTotal - safeTotal);

    return Math.max(0, skips);
}

export function getProjectedAttendanceIfAttendAll(
    subject: AttendanceSubject,
    remainingClasses: number
) {
    const safeRemaining = safeClassCount(remainingClasses);
    const projectedTotal = subject.total + safeRemaining;

    if (projectedTotal <= 0) return 0;

    const projected = ((subject.attended + safeRemaining) / projectedTotal) * 100;

    return clampPercent(projected);
}

export function getProjectedAttendanceIfSkipAll(
    subject: AttendanceSubject,
    remainingClasses: number
) {
    const safeRemaining = safeClassCount(remainingClasses);
    const projectedTotal = subject.total + safeRemaining;

    if (projectedTotal <= 0) return 0;

    const projected = (subject.attended / projectedTotal) * 100;

    return clampPercent(projected);
}

export function getAttendancePredictorPlan({
    attended,
    total,
    target,
    remainingClasses,
}: {
    attended: number;
    total: number;
    target: number;
    remainingClasses?: number;
}): AttendancePredictorPlan {
    const safeAttended = safeClassCount(attended);
    const safeTotal = Math.max(safeClassCount(total), safeAttended);
    const safeTarget = clampNumber(target, 0, 100);
    const safeRemainingClasses =
        remainingClasses === undefined ? undefined : safeClassCount(remainingClasses);
    const percent = getAttendancePercent(safeAttended, safeTotal);
    const status = getAttendanceTone(percent, safeTarget);
    const classesNeeded = getRequiredClassesToReachTarget(
        safeAttended,
        safeTotal,
        safeTarget
    );
    const remainingSkips = getRemainingSkips(safeAttended, safeTotal, safeTarget);
    const projectedIfAttendAll = getAttendancePercent(
        safeAttended + (safeRemainingClasses ?? 0),
        safeTotal + (safeRemainingClasses ?? 0)
    );
    const projectedIfSkipAll = getAttendancePercent(
        safeAttended,
        safeTotal + (safeRemainingClasses ?? 0)
    );
    const perfectTargetCannotRecover =
        safeTarget >= 100 && percent < safeTarget && safeAttended < safeTotal;
    const isRecoverable =
        percent >= safeTarget ||
        safeRemainingClasses === undefined ||
        (!perfectTargetCannotRecover && classesNeeded <= safeRemainingClasses);

    let headline = "On track";
    let advice = `You can bunk ${remainingSkips} class${remainingSkips === 1 ? "" : "es"} and stay above ${safeTarget}%.`;

    if (percent < safeTarget) {
        headline = isRecoverable ? "Recovery path" : "Recovery risk";
        advice = perfectTargetCannotRecover
            ? "A 100% target cannot be recovered after missed classes."
            : isRecoverable
                ? `Attend next ${classesNeeded} class${classesNeeded === 1 ? "" : "es"} to reach ${safeTarget}%.`
                : `Attend all ${safeRemainingClasses ?? 0} remaining class${safeRemainingClasses === 1 ? "" : "es"} and you may still miss ${safeTarget}%.`;
    } else if (remainingSkips <= 0) {
        headline = "Hold the line";
        advice = `Stay consistent to remain above ${safeTarget}%.`;
    }

    return {
        percent,
        status,
        classesNeeded,
        remainingSkips,
        projectedIfAttendAll,
        projectedIfSkipAll,
        isRecoverable,
        headline,
        advice,
    };
}

export function getAttendancePlan(
    subject: AttendanceSubject,
    target = 75,
    remainingClasses = 0
): AttendancePlan {
    const safeRemainingClasses = safeClassCount(remainingClasses);
    const plan = getAttendancePredictorPlan({
        attended: subject.attended,
        total: subject.total,
        target,
        remainingClasses: safeRemainingClasses,
    });

    return {
        ...plan,
        progressTone: getProgressTone(plan.status),
        remainingClasses: safeRemainingClasses,
    };
}

export function simulateAttendanceScenario(
    attended: number,
    total: number,
    attendNext: number,
    skipNext: number
): AttendanceScenario {
    const safeAttendNext = safeClassCount(attendNext);
    const safeSkipNext = safeClassCount(skipNext);
    const currentAttended = safeClassCount(attended);
    const currentTotal = Math.max(safeClassCount(total), currentAttended);
    const projectedAttended = currentAttended + safeAttendNext;
    const projectedTotal =
        currentTotal +
        safeAttendNext +
        safeSkipNext;

    return {
        attended: projectedAttended,
        total: projectedTotal,
        percent: getAttendancePercent(projectedAttended, projectedTotal),
    };
}

export function getProjectedAttendanceAdvice(
    subject: AttendanceSubject,
    target = 75,
    remainingClasses = 0
): ProjectedAttendanceAdvice {
    const plan = getAttendancePlan(subject, target, remainingClasses);

    return {
        percent: plan.percent,
        tone: plan.status,
        progressTone: plan.progressTone,
        remainingClasses: plan.remainingClasses,
        projectedIfAttendAll: plan.projectedIfAttendAll,
        projectedIfSkipAll: plan.projectedIfSkipAll,
        classesNeeded: plan.classesNeeded,
        remainingSkips: plan.remainingSkips,
        impossible: !plan.isRecoverable,
        message: plan.advice,
    };
}

export function estimateSubjectInstructionalClassesBySemesterEnd({
    subject,
    timetable = [],
    semesterStartDate,
    semesterEndDate,
    excludedDates = [],
}: InstructionalEstimateInput) {
    if (!semesterEndDate) return 0;

    const today = new Date();
    const start = semesterStartDate ? new Date(semesterStartDate) : today;
    const end = new Date(semesterEndDate);

    if (Number.isNaN(end.getTime())) return 0;

    const effectiveStart = start > today ? start : today;

    if (effectiveStart > end) return 0;

    const normalizedSubjectCode = normalizeSearch(subject.code);
    const normalizedSubjectName = normalizeSearch(subject.name);

    const matchingSlots = timetable.filter((slot) => {
        const slotCode = normalizeSearch(slot.code ?? "");
        const slotSubject = normalizeSearch(slot.subject ?? "");

        return (
            slotCode === normalizedSubjectCode ||
            slotSubject === normalizedSubjectName ||
            slotSubject.includes(normalizedSubjectName) ||
            normalizedSubjectName.includes(slotSubject)
        );
    });

    if (matchingSlots.length === 0) return 0;

    const excludedSet = new Set(excludedDates);
    let count = 0;

    const cursor = new Date(effectiveStart);

    while (cursor <= end) {
        const dateKey = toDateKey(cursor);

        if (!excludedSet.has(dateKey)) {
            const day = cursor.getDay();

            const slotsForDay = matchingSlots.filter((slot) => {
                const dayIndex = DAY_INDEX[(slot.day ?? "").toLowerCase().trim()];

                return dayIndex === day;
            });

            count += slotsForDay.length;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return count;
}

export function toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function formatPercent(value: number) {
    return `${Math.round(clampNumber(value, 0, 100))}%`;
}

export function formatSubjectLabel(subject: AttendanceSubject) {
    return `${subject.code} • ${subject.name}`;
}

/* Result helpers */

export function getAverageResult(results: ResultItem[]) {
    const valid = results.filter((item) => item.total !== null) as { total: number }[];
    if (valid.length === 0) return null;

    const total = valid.reduce((sum, item) => sum + item.total, 0);

    return Math.round(total / valid.length);
}

export function getHighestResult(results: ResultItem[]) {
    const valid = results.filter((item) => item.total !== null) as { total: number }[];
    if (valid.length === 0) return null;

    return valid.reduce((highest, item) =>
        item.total > highest.total ? item : highest
    ) as unknown as ResultItem;
}

export function getLowestResult(results: ResultItem[]) {
    const valid = results.filter((item) => item.total !== null) as { total: number }[];
    if (valid.length === 0) return null;

    return valid.reduce((lowest, item) =>
        item.total < lowest.total ? item : lowest
    ) as unknown as ResultItem;
}

export function getGradeDistribution(results: ResultItem[]) {
    return results.reduce<Record<string, number>>((distribution, item) => {
        const rawGrade = item.grade?.trim() || "";
        const grade =
            rawGrade &&
            !["NA", "N/A", "NULL", "NONE", "TAL", "UNDEFINED"].includes(
                rawGrade.toUpperCase()
            )
                ? rawGrade
                : "-";

        distribution[grade] = (distribution[grade] ?? 0) + 1;

        return distribution;
    }, {});
}

export function getResultStatus(total: number): ResultStatus {
    if (total >= 85) return "excellent";
    if (total >= 75) return "good";
    if (total >= 60) return "average";

    return "low";
}

export function getResultTone(status: ResultStatus) {
    if (status === "excellent") return "green";
    if (status === "good") return "blue";
    if (status === "average") return "orange";

    return "red";
}

export function getResultStatusLabel(status: ResultStatus) {
    if (status === "excellent") return "Excellent";
    if (status === "good") return "Good";
    if (status === "average") return "Average";

    return "Needs Focus";
}
