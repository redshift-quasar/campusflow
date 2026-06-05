import type { AttendanceSubject } from "@/lib/academic-utils";
import {
    clampPercent,
    getAttendancePercent,
    normalizeSearch,
} from "@/lib/academic-utils";

export type PredictorAttendanceSubject = {
    id: string;
    name: string;
    code?: string;
    attended: number;
    total: number;
    percentage?: number;
    remainingClasses?: number;
};

export type CalendarBunkSimulationResult = {
    subjects: Array<
        PredictorAttendanceSubject & {
            predictedAttended: number;
            predictedTotal: number;
            predictedPercent: number;
            missedClassesFromBunkDays: number;
        }
    >;
    totalBunkDays: number;
    totalMissedClasses: number;
    averageBefore: number;
    averageAfter: number;
};

type AttendanceLike = Partial<AttendanceSubject> & {
    percentage?: number | string;
    percent?: number | string;
    subject?: string;
    subjectName?: string;
    present?: number | string;
    totalClasses?: number | string;
};

function safeClassCount(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
}

function safePercent(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed)) return undefined;

    return getAttendancePercent(parsed, 100);
}

function getSubjectId(subject: AttendanceLike, index: number) {
    const rawId = subject.code || subject.name || subject.subject || `subject-${index}`;
    const normalized = normalizeSearch(String(rawId));

    return `${normalized || "subject"}-${index}`;
}

export function normalizePredictorAttendanceSubject(
    subject: AttendanceLike,
    index: number
): PredictorAttendanceSubject | null {
    const name =
        subject.name?.trim() ||
        subject.subjectName?.trim() ||
        subject.subject?.trim() ||
        subject.code?.trim() ||
        "";

    if (!name) return null;

    const attended = safeClassCount(subject.attended ?? subject.present);
    const total = Math.max(
        safeClassCount(subject.total ?? subject.totalClasses),
        attended
    );
    const code = subject.code?.trim();

    return {
        id: getSubjectId(subject, index),
        name,
        code: code || undefined,
        attended,
        total,
        percentage: safePercent(subject.percentage ?? subject.percent),
    };
}

export function normalizePredictorAttendanceSubjects(
    subjects: AttendanceLike[]
) {
    return subjects
        .map(normalizePredictorAttendanceSubject)
        .filter((subject): subject is PredictorAttendanceSubject =>
            Boolean(subject)
        );
}

function getSubjectMatchScore(
    subject: PredictorAttendanceSubject,
    classItem: {
        subjectId?: string;
        subjectCode?: string;
        subjectName?: string;
    }
) {
    const subjectId = normalizeSearch(subject.id);
    const subjectCode = normalizeSearch(subject.code ?? "");
    const subjectName = normalizeSearch(subject.name);
    const classId = normalizeSearch(classItem.subjectId ?? "");
    const classCode = normalizeSearch(classItem.subjectCode ?? "");
    const className = normalizeSearch(classItem.subjectName ?? "");

    if (classId && classId === subjectId) return 4;
    if (classCode && subjectCode && classCode === subjectCode) return 3;
    if (className && className === subjectName) return 2;
    if (
        className &&
        subjectName &&
        (className.includes(subjectName) || subjectName.includes(className))
    ) {
        return 1;
    }

    return 0;
}

function findMatchingSubjectIndex(
    subjects: PredictorAttendanceSubject[],
    classItem: {
        subjectId?: string;
        subjectCode?: string;
        subjectName?: string;
    }
) {
    let bestIndex = -1;
    let bestScore = 0;

    subjects.forEach((subject, index) => {
        const score = getSubjectMatchScore(subject, classItem);

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function getAveragePercent(subjects: PredictorAttendanceSubject[]) {
    if (subjects.length === 0) return 0;

    return clampPercent(
        subjects.reduce(
            (sum, subject) => sum + getAttendancePercent(subject.attended, subject.total),
            0
        ) / subjects.length
    );
}

export function simulateCalendarBunkPlan({
    subjects,
    bunkDateKeys,
    getClassesForDate,
    fallbackClassesPerBunkDay = 0,
}: {
    subjects: PredictorAttendanceSubject[];
    bunkDateKeys: string[];
    target: number;
    getClassesForDate?: (dateKey: string) => Array<{
        subjectId?: string;
        subjectCode?: string;
        subjectName?: string;
    }>;
    fallbackClassesPerBunkDay?: number;
}): CalendarBunkSimulationResult {
    const safeSubjects = subjects.map((subject) => ({
        ...subject,
        attended: safeClassCount(subject.attended),
        total: Math.max(safeClassCount(subject.total), safeClassCount(subject.attended)),
    }));
    const missesByIndex = new Map<number, number>();
    const safeBunkDateKeys = bunkDateKeys.filter(Boolean);
    const fallbackCount = safeClassCount(fallbackClassesPerBunkDay);

    if (getClassesForDate) {
        safeBunkDateKeys.forEach((dateKey) => {
            getClassesForDate(dateKey).forEach((classItem) => {
                const subjectIndex = findMatchingSubjectIndex(safeSubjects, classItem);

                if (subjectIndex >= 0) {
                    missesByIndex.set(
                        subjectIndex,
                        (missesByIndex.get(subjectIndex) ?? 0) + 1
                    );
                }
            });
        });
    } else if (fallbackCount > 0 && safeSubjects.length > 0) {
        const sortedIndexes = safeSubjects
            .map((subject, index) => ({
                index,
                percent: getAttendancePercent(subject.attended, subject.total),
            }))
            .sort((a, b) => a.percent - b.percent)
            .map((item) => item.index);
        const totalFallbackMisses = safeBunkDateKeys.length * fallbackCount;

        for (let missIndex = 0; missIndex < totalFallbackMisses; missIndex += 1) {
            const subjectIndex = sortedIndexes[missIndex % sortedIndexes.length];

            missesByIndex.set(
                subjectIndex,
                (missesByIndex.get(subjectIndex) ?? 0) + 1
            );
        }
    }

    let totalMissedClasses = 0;
    const predictedSubjects = safeSubjects.map((subject, index) => {
        const missedClassesFromBunkDays = missesByIndex.get(index) ?? 0;
        const predictedTotal = subject.total + missedClassesFromBunkDays;
        const predictedPercent = getAttendancePercent(
            subject.attended,
            predictedTotal
        );

        totalMissedClasses += missedClassesFromBunkDays;

        return {
            ...subject,
            predictedAttended: subject.attended,
            predictedTotal,
            predictedPercent,
            missedClassesFromBunkDays,
        };
    });

    return {
        subjects: predictedSubjects,
        totalBunkDays: safeBunkDateKeys.length,
        totalMissedClasses,
        averageBefore: getAveragePercent(safeSubjects),
        averageAfter: getAveragePercent(
            predictedSubjects.map((subject) => ({
                ...subject,
                attended: subject.predictedAttended,
                total: subject.predictedTotal,
            }))
        ),
    };
}
