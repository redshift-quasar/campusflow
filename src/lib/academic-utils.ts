export type AttendanceSubject = {
    code: string;
    name: string;
    faculty?: string;
    attended: number;
    total: number;
    credits?: number;
    color?: string;
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

export function getAttendancePercent(subject: AttendanceSubject) {
    if (!subject.total || subject.total <= 0) return 0;

    const percent = (subject.attended / subject.total) * 100;

    return Math.round(clampNumber(percent, 0, 100));
}

export function getExactAttendancePercent(subject: AttendanceSubject) {
    if (!subject.total || subject.total <= 0) return 0;

    const percent = (subject.attended / subject.total) * 100;

    return Number(clampNumber(percent, 0, 100).toFixed(2));
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
    const targetRatio = target / 100;

    if (targetRatio <= 0) return 0;

    if (targetRatio >= 1) {
        return attended >= total ? 0 : Number.POSITIVE_INFINITY;
    }

    const currentPercent = total > 0 ? (attended / total) * 100 : 0;

    if (currentPercent >= target) return 0;

    const required = (targetRatio * total - attended) / (1 - targetRatio);

    return Math.max(0, Math.ceil(required));
}

export function getRemainingSkips(
    attended: number,
    total: number,
    target = 75
) {
    const targetRatio = target / 100;

    if (targetRatio <= 0) return Number.POSITIVE_INFINITY;
    if (targetRatio >= 1) return 0;

    const allowedTotal = attended / targetRatio;
    const skips = Math.floor(allowedTotal - total);

    return Math.max(0, skips);
}

export function getProjectedAttendanceIfAttendAll(
    subject: AttendanceSubject,
    remainingClasses: number
) {
    const safeRemaining = Math.max(0, remainingClasses);
    const projectedTotal = subject.total + safeRemaining;

    if (projectedTotal <= 0) return 0;

    const projected = ((subject.attended + safeRemaining) / projectedTotal) * 100;

    return Math.round(clampNumber(projected, 0, 100));
}

export function getProjectedAttendanceIfSkipAll(
    subject: AttendanceSubject,
    remainingClasses: number
) {
    const safeRemaining = Math.max(0, remainingClasses);
    const projectedTotal = subject.total + safeRemaining;

    if (projectedTotal <= 0) return 0;

    const projected = (subject.attended / projectedTotal) * 100;

    return Math.round(clampNumber(projected, 0, 100));
}

export function getProjectedAttendanceAdvice(
    subject: AttendanceSubject,
    target = 75,
    remainingClasses = 0
): ProjectedAttendanceAdvice {
    const percent = getAttendancePercent(subject);
    const tone = getAttendanceTone(percent, target);
    const progressTone = getProgressTone(tone);

    const classesNeeded = getRequiredClassesToReachTarget(
        subject.attended,
        subject.total,
        target
    );

    const remainingSkips = getRemainingSkips(
        subject.attended,
        subject.total,
        target
    );

    const projectedIfAttendAll = getProjectedAttendanceIfAttendAll(
        subject,
        remainingClasses
    );

    const projectedIfSkipAll = getProjectedAttendanceIfSkipAll(
        subject,
        remainingClasses
    );

    const impossible =
        remainingClasses > 0
            ? projectedIfAttendAll < target
            : classesNeeded === Number.POSITIVE_INFINITY;

    let message = "You are currently safe.";

    if (impossible) {
        message =
            "Even attending all remaining estimated classes may not reach target.";
    } else if (percent < target) {
        message = `Attend next ${classesNeeded} class${classesNeeded === 1 ? "" : "es"
            } to reach ${target}%.`;
    } else if (remainingSkips > 0) {
        message = `You can skip around ${remainingSkips} class${remainingSkips === 1 ? "" : "es"
            } and stay above ${target}%.`;
    } else {
        message = `Stay consistent to remain above ${target}%.`;
    }

    return {
        percent,
        tone,
        progressTone,
        remainingClasses: Math.max(0, remainingClasses),
        projectedIfAttendAll,
        projectedIfSkipAll,
        classesNeeded,
        remainingSkips,
        impossible,
        message,
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
        distribution[item.grade] = (distribution[item.grade] ?? 0) + 1;

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