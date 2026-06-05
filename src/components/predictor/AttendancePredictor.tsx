"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Database, RotateCcw } from "lucide-react";

import { AttendanceBunkSummary } from "@/components/predictor/AttendanceBunkSummary";
import { AttendancePredictorForm } from "@/components/predictor/AttendancePredictorForm";
import type { AttendancePredictorFormPayload } from "@/components/predictor/AttendancePredictorForm";
import { AttendancePredictorSetup } from "@/components/predictor/AttendancePredictorSetup";
import { AttendancePredictorSummary } from "@/components/predictor/AttendancePredictorSummary";
import { AttendanceSubjectPredictorCard } from "@/components/predictor/AttendanceSubjectPredictorCard";
import { BunkCalendar } from "@/components/predictor/BunkCalendar";
import { StudioIconBubble } from "@/components/studio/Studio";
import {
    clampPercent,
    getAttendancePercent,
    getAttendancePredictorPlan,
    simulateAttendanceScenario,
} from "@/lib/academic-utils";
import {
    normalizePredictorAttendanceSubjects,
    simulateCalendarBunkPlan,
    type PredictorAttendanceSubject,
} from "@/lib/attendance-predictor";
import {
    getDateRange,
    getRemainingCalendarDays,
    parseDateKey,
    toDateKey,
} from "@/lib/attendance-calendar";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";
import { usePesuTimetable } from "@/lib/hooks/use-pesu-timetable";
import { staggerContainer } from "@/lib/motion";
import { useAttendanceStore } from "@/lib/store/attendance-store";

const MANUAL_STORAGE_KEY = "campusflow:attendance-predictor-subjects";
const SETTINGS_STORAGE_KEY = "campusflow:predictor-settings";
const BUNK_DATES_STORAGE_KEY = "campusflow:predictor-bunk-dates";
const SCENARIOS_STORAGE_KEY = "campusflow:predictor-subject-scenarios";

type ScenarioSnapshot = {
    attendNext: number;
    bunkNext: number;
};

type PredictorSettings = {
    target?: number;
    semesterEndDate?: string;
    blockedDateKeys?: string[];
    defaultRemainingClasses?: number;
    fallbackClassesPerBunkDay?: number;
};

type SubjectPlanItem = {
    subject: PredictorAttendanceSubject;
    syncedSubject: PredictorAttendanceSubject;
    remainingClasses?: number;
    plan: ReturnType<typeof getAttendancePredictorPlan>;
    simulationActive: boolean;
    calendarMissedClasses: number;
    calendarPredictedPercent: number;
};

function createSubjectId() {
    if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }

    return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeClassCount(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
}

function optionalClassCount(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;

    return safeClassCount(value);
}

function clampTarget(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed)) return 75;

    return Math.min(100, Math.max(1, Number(parsed.toFixed(2))));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function parseStoredSubject(value: unknown): PredictorAttendanceSubject | null {
    if (!isRecord(value)) return null;

    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (!name) return null;

    const attended = safeClassCount(value.attended);
    const total = Math.max(safeClassCount(value.total), attended);
    const code = typeof value.code === "string" ? value.code.trim() : "";

    return {
        id: typeof value.id === "string" && value.id ? value.id : createSubjectId(),
        name,
        code: code || undefined,
        attended,
        total,
        remainingClasses: optionalClassCount(value.remainingClasses),
    };
}

function loadJsonValue<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;

        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function loadManualSubjects() {
    const parsed = loadJsonValue<unknown[]>(MANUAL_STORAGE_KEY, []);

    if (!Array.isArray(parsed)) return [];

    return parsed
        .map(parseStoredSubject)
        .filter((subject): subject is PredictorAttendanceSubject =>
            Boolean(subject)
        );
}

function loadSettings(): PredictorSettings {
    const parsed = loadJsonValue<unknown>(SETTINGS_STORAGE_KEY, {});

    if (!isRecord(parsed)) return {};

    return {
        target: parsed.target === undefined ? undefined : clampTarget(parsed.target),
        semesterEndDate:
            typeof parsed.semesterEndDate === "string"
                ? parsed.semesterEndDate
                : undefined,
        blockedDateKeys: Array.isArray(parsed.blockedDateKeys)
            ? parsed.blockedDateKeys.filter(
                (dateKey): dateKey is string => typeof dateKey === "string"
            )
            : undefined,
        defaultRemainingClasses: optionalClassCount(parsed.defaultRemainingClasses),
        fallbackClassesPerBunkDay: optionalClassCount(
            parsed.fallbackClassesPerBunkDay
        ),
    };
}

function loadScenarioState() {
    const parsed = loadJsonValue<Record<string, unknown>>(SCENARIOS_STORAGE_KEY, {});
    const scenarios: Record<string, ScenarioSnapshot> = {};

    Object.entries(parsed).forEach(([subjectId, value]) => {
        if (!isRecord(value)) return;

        scenarios[subjectId] = {
            attendNext: safeClassCount(value.attendNext),
            bunkNext: safeClassCount(value.bunkNext),
        };
    });

    return scenarios;
}

function getTargetError(value: string) {
    if (value.trim() === "") return "";

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return "Target percentage must be a valid number.";
    if (parsed < 1 || parsed > 100) return "Target percentage must be between 1 and 100.";

    return "";
}

function getClassInputError(label: string, value: string, max = 500) {
    if (value.trim() === "") return "";

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return `${label} must be a valid number.`;
    if (parsed < 0) return `${label} cannot be negative.`;
    if (!Number.isInteger(parsed)) return `${label} must be a whole number.`;
    if (parsed > max) return `${label} is too high for a safe prediction.`;

    return "";
}

function getSemesterError(semesterEndDate: string, todayKey: string) {
    if (!semesterEndDate) return "";

    const parsed = parseDateKey(semesterEndDate);

    if (!parsed) return "Enter a valid semester end date.";
    if (semesterEndDate < todayKey) return "Semester end date cannot be before today.";

    return "";
}

function getWeekdayForDateKey(dateKey: string) {
    const date = parseDateKey(dateKey);

    if (!date) return "";

    return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatAverage(value: number) {
    return clampPercent(value);
}

function sortDateKeys(dateKeys: string[]) {
    return Array.from(new Set(dateKeys)).sort();
}

function getManualSubjectKey(subject: PredictorAttendanceSubject) {
    return subject.code?.trim() || subject.id;
}

export function AttendancePredictor() {
    const {
        subjects,
        source,
        syncedAt,
        mode,
    } = usePesuAttendance();
    const { calendar } = usePesuSession();
    const { slots: timetableSlots, source: timetableSource } = usePesuTimetable();
    const manualByCode = useAttendanceStore((state) => state.manualByCode);
    const setManualSubjectAttendance = useAttendanceStore(
        (state) => state.setManualSubjectAttendance
    );
    const todayKey = toDateKey(new Date());
    const syncedSubjectsRaw = useMemo(
        () =>
            source === "pesu"
                ? normalizePredictorAttendanceSubjects(subjects)
                : [],
        [source, subjects]
    );
    const isManualFallback = mode === "manual-fallback";
    const syncedSubjects = useMemo(
        () =>
            syncedSubjectsRaw.map((subject) => {
                if (!isManualFallback) return subject;

                const manual = manualByCode[getManualSubjectKey(subject)];

                if (!manual) return subject;

                return {
                    ...subject,
                    attended: manual.attended,
                    total: Math.max(manual.total, manual.attended),
                };
            }),
        [isManualFallback, manualByCode, syncedSubjectsRaw]
    );
    const hasSyncedSubjects = source === "pesu" && syncedSubjects.length > 0;
    const [target, setTarget] = useState(75);
    const [customTarget, setCustomTarget] = useState("75");
    const [semesterEndDate, setSemesterEndDate] = useState("");
    const [calendarPrefillApplied, setCalendarPrefillApplied] = useState(false);
    const [blockedDateInput, setBlockedDateInput] = useState("");
    const [blockedDateError, setBlockedDateError] = useState("");
    const [blockedDateKeys, setBlockedDateKeys] = useState<string[]>([]);
    const [defaultRemainingClasses, setDefaultRemainingClasses] = useState("");
    const [fallbackClassesPerBunkDay, setFallbackClassesPerBunkDay] =
        useState("3");
    const [bunkDateKeys, setBunkDateKeys] = useState<string[]>([]);
    const [manualSubjects, setManualSubjects] = useState<
        PredictorAttendanceSubject[]
    >([]);
    const [scenarios, setScenarios] = useState<Record<string, ScenarioSnapshot>>(
        {}
    );
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let cancelled = false;

        queueMicrotask(() => {
            if (cancelled) return;

            const settings = loadSettings();
            const storedTarget = settings.target ?? 75;

            setTarget(storedTarget);
            setCustomTarget(String(storedTarget));
            setSemesterEndDate(settings.semesterEndDate ?? "");
            setBlockedDateKeys(sortDateKeys(settings.blockedDateKeys ?? []));
            setDefaultRemainingClasses(
                settings.defaultRemainingClasses === undefined
                    ? ""
                    : String(settings.defaultRemainingClasses)
            );
            setFallbackClassesPerBunkDay(
                settings.fallbackClassesPerBunkDay === undefined
                    ? "3"
                    : String(settings.fallbackClassesPerBunkDay)
            );
            setBunkDateKeys(sortDateKeys(loadJsonValue<string[]>(BUNK_DATES_STORAGE_KEY, [])));
            setManualSubjects(loadManualSubjects());
            setScenarios(loadScenarioState());
            setHydrated(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const targetError = getTargetError(customTarget);
    const defaultRemainingClassesError = getClassInputError(
        "Default remaining classes",
        defaultRemainingClasses,
        1000
    );
    const fallbackClassesPerBunkDayError = getClassInputError(
        "Fallback classes per bunk day",
        fallbackClassesPerBunkDay,
        50
    );
    const semesterError = getSemesterError(semesterEndDate, todayKey);
    const calendarUsable = Boolean(
        calendar?.source === "pesu-academy" &&
        calendar?.usableForPrediction &&
        calendar.calendarStatus !== "past"
    );
    const calendarEndDate = calendarUsable && calendar?.endDate ? calendar.endDate : "";
    const calendarBlockedDateKeys = useMemo(
        () =>
            calendarUsable
                ? sortDateKeys(
                    (calendar?.blockedDateKeys ?? []).filter(
                        (dateKey): dateKey is string => typeof dateKey === "string"
                    )
                )
                : [],
        [calendar?.blockedDateKeys, calendarUsable]
    );
    const mergedBlockedDateKeys = useMemo(
        () => sortDateKeys([...blockedDateKeys, ...calendarBlockedDateKeys]),
        [blockedDateKeys, calendarBlockedDateKeys]
    );
    const sundayDateKeys = useMemo(() => {
        const parsedSemesterEnd = semesterEndDate
            ? parseDateKey(semesterEndDate)
            : null;

        if (!parsedSemesterEnd || semesterError) return [];

        return getDateRange(new Date(), parsedSemesterEnd)
            .filter((date) => date.getDay() === 0)
            .map(toDateKey)
            .filter(Boolean);
    }, [semesterEndDate, semesterError]);
    const effectiveBlockedDateKeys = useMemo(
        () => sortDateKeys([...mergedBlockedDateKeys, ...sundayDateKeys]),
        [mergedBlockedDateKeys, sundayDateKeys]
    );
    const calendarModeLabel =
        calendarEndDate && semesterEndDate === calendarEndDate
            ? "PESU Calendar"
            : semesterEndDate
                ? "Manual Date"
                : "Estimate";

    useEffect(() => {
        if (
            !hydrated ||
            calendarPrefillApplied ||
            !calendarEndDate
        ) {
            return;
        }

        let cancelled = false;

        queueMicrotask(() => {
            if (cancelled) return;

            if (semesterEndDate !== calendarEndDate) {
                setSemesterEndDate(calendarEndDate);
            }

            setCalendarPrefillApplied(true);
        });

        return () => {
            cancelled = true;
        };
    }, [
        calendarEndDate,
        calendarPrefillApplied,
        hydrated,
        semesterEndDate,
    ]);

    const remainingDays = useMemo(() => {
        const parsedSemesterEnd = semesterEndDate
            ? parseDateKey(semesterEndDate)
            : null;

        if (!parsedSemesterEnd || semesterError) {
            return {
                totalDays: 0,
                academicDays: 0,
                dateKeys: [],
            };
        }

        return getRemainingCalendarDays({
            fromDate: new Date(),
            semesterEndDate: parsedSemesterEnd,
            blockedDateKeys: mergedBlockedDateKeys,
            excludeSundays: true,
        });
    }, [mergedBlockedDateKeys, semesterEndDate, semesterError]);
    const validBunkDateKeys = useMemo(() => {
        if (!semesterEndDate || semesterError) return [];

        const blockedSet = new Set(effectiveBlockedDateKeys);

        return sortDateKeys(
            bunkDateKeys.filter(
                (dateKey) =>
                    dateKey >= todayKey &&
                    dateKey <= semesterEndDate &&
                    !blockedSet.has(dateKey)
                )
        );
    }, [
        bunkDateKeys,
        effectiveBlockedDateKeys,
        semesterEndDate,
        semesterError,
        todayKey,
    ]);
    const defaultRemaining = useMemo(
        () =>
            defaultRemainingClassesError
                ? undefined
                : optionalClassCount(defaultRemainingClasses),
        [defaultRemainingClasses, defaultRemainingClassesError]
    );
    const fallbackClassCount = useMemo(
        () =>
            fallbackClassesPerBunkDayError
                ? 0
                : safeClassCount(fallbackClassesPerBunkDay),
        [fallbackClassesPerBunkDay, fallbackClassesPerBunkDayError]
    );
    const activeSubjects = hasSyncedSubjects ? syncedSubjects : manualSubjects;
    const showLivePlanningTools = mode === "live" && hasSyncedSubjects;
    const dataLabel =
        mode === "live"
            ? "PESU Live"
            : hasSyncedSubjects && isManualFallback
                ? "Manual from Courses"
                : "Manual fallback";
    const canUseTimetableMapping =
        showLivePlanningTools &&
        timetableSource === "pesu" &&
        timetableSlots.length > 0;
    const activeBunkDateKeys = useMemo(
        () => (showLivePlanningTools ? validBunkDateKeys : []),
        [showLivePlanningTools, validBunkDateKeys]
    );
    const approximateMode =
        activeBunkDateKeys.length > 0 && !canUseTimetableMapping;
    const remainingEstimate =
        defaultRemaining !== undefined
            ? defaultRemaining
            : semesterEndDate && !semesterError
                ? remainingDays.academicDays
                : undefined;
    const planningRemainingEstimate = showLivePlanningTools
        ? remainingEstimate
        : undefined;
    const totalEstimatedRemainingClasses = activeSubjects.reduce(
        (sum, subject) =>
            sum + (subject.remainingClasses ?? planningRemainingEstimate ?? 0),
        0
    );

    useEffect(() => {
        if (!hydrated) return;

        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify({
                target,
                semesterEndDate,
                blockedDateKeys,
                defaultRemainingClasses: optionalClassCount(defaultRemainingClasses),
                fallbackClassesPerBunkDay: fallbackClassCount,
            })
        );
        localStorage.setItem(BUNK_DATES_STORAGE_KEY, JSON.stringify(validBunkDateKeys));
        localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(manualSubjects));
        localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
    }, [
        blockedDateKeys,
        defaultRemainingClasses,
        fallbackClassCount,
        hydrated,
        manualSubjects,
        scenarios,
        semesterEndDate,
        target,
        validBunkDateKeys,
    ]);

    const calendarSimulation = useMemo(() => {
        return simulateCalendarBunkPlan({
            subjects: activeSubjects,
            bunkDateKeys: activeBunkDateKeys,
            target,
            getClassesForDate: canUseTimetableMapping
                ? (dateKey) => {
                    const weekday = getWeekdayForDateKey(dateKey);

                    return timetableSlots
                        .filter((slot) => slot.day === weekday)
                        .map((slot) => ({
                            subjectCode: slot.code,
                            subjectName: slot.subject,
                        }));
                }
                : undefined,
            fallbackClassesPerBunkDay: canUseTimetableMapping ? 0 : fallbackClassCount,
        });
    }, [
        activeBunkDateKeys,
        activeSubjects,
        canUseTimetableMapping,
        fallbackClassCount,
        target,
        timetableSlots,
    ]);

    const subjectLookup = useMemo(() => {
        return new Map(activeSubjects.map((subject) => [subject.id, subject]));
    }, [activeSubjects]);

    const baselinePlans = useMemo(() => {
        return activeSubjects.map((subject) => ({
            subject,
            plan: getAttendancePredictorPlan({
                attended: subject.attended,
                total: subject.total,
                target,
                remainingClasses: planningRemainingEstimate,
            }),
        }));
    }, [activeSubjects, planningRemainingEstimate, target]);

    const baselineSummary = useMemo(() => {
        const average =
            baselinePlans.length > 0
                ? formatAverage(
                    baselinePlans.reduce((sum, item) => sum + item.plan.percent, 0) /
                    baselinePlans.length
                )
                : 0;
        const safeCount = baselinePlans.filter(
            (item) => item.plan.status === "safe"
        ).length;
        const warningCount = baselinePlans.filter(
            (item) => item.plan.status === "warning"
        ).length;
        const dangerCount = baselinePlans.filter(
            (item) => item.plan.status === "danger"
        ).length;
        const totalSkips = baselinePlans.reduce(
            (sum, item) => sum + item.plan.remainingSkips,
            0
        );
        const totalNeeded = baselinePlans.reduce(
            (sum, item) =>
                item.plan.percent < target ? sum + item.plan.classesNeeded : sum,
            0
        );
        const lowest = baselinePlans
            .slice()
            .sort((a, b) => a.plan.percent - b.plan.percent)[0];

        return {
            average,
            safeCount,
            warningCount,
            dangerCount,
            totalSkips,
            totalNeeded,
            lowest: lowest
                ? {
                    name: lowest.subject.name,
                    percent: lowest.plan.percent,
                }
                : null,
        };
    }, [baselinePlans, target]);

    const calendarPlanSummary = useMemo(() => {
        const plans = calendarSimulation.subjects.map((subject) => {
            const remaining =
                planningRemainingEstimate === undefined
                    ? undefined
                    : Math.max(
                        0,
                        planningRemainingEstimate - subject.missedClassesFromBunkDays
                    );
            const plan = getAttendancePredictorPlan({
                attended: subject.predictedAttended,
                total: subject.predictedTotal,
                target,
                remainingClasses: remaining,
            });
            const currentPercent = getAttendancePercent(subject.attended, subject.total);
            const drop = Math.max(
                0,
                Number((currentPercent - subject.predictedPercent).toFixed(2))
            );

            return {
                subject,
                plan,
                remaining,
                drop,
                unrecoverable: remaining !== undefined && !plan.isRecoverable,
            };
        });
        const biggestDrop = plans
            .slice()
            .sort((a, b) => b.drop - a.drop)[0];

        return {
            safeCount: plans.filter((item) => item.plan.status === "safe").length,
            warningCount: plans.filter((item) => item.plan.status === "warning").length,
            dangerCount: plans.filter((item) => item.plan.status === "danger").length,
            unrecoverableCount: plans.filter((item) => item.unrecoverable).length,
            biggestDropSubject:
                biggestDrop && biggestDrop.drop > 0
                    ? {
                        name: biggestDrop.subject.name,
                        drop: biggestDrop.drop,
                    }
                    : null,
        };
    }, [calendarSimulation.subjects, planningRemainingEstimate, target]);

    const subjectPlans = useMemo<SubjectPlanItem[]>(() => {
        return calendarSimulation.subjects
            .map((calendarSubject) => {
                const baseSubject =
                    subjectLookup.get(calendarSubject.id) ?? calendarSubject;
                const scenario = scenarios[calendarSubject.id];
                const calendarAdjustedSubject: PredictorAttendanceSubject = {
                    ...baseSubject,
                    attended: calendarSubject.predictedAttended,
                    total: calendarSubject.predictedTotal,
                };
                const scenarioResult = scenario
                    ? simulateAttendanceScenario(
                        calendarAdjustedSubject.attended,
                        calendarAdjustedSubject.total,
                        scenario.attendNext,
                        scenario.bunkNext
                    )
                    : {
                        attended: calendarAdjustedSubject.attended,
                        total: calendarAdjustedSubject.total,
                        percent: getAttendancePercent(
                            calendarAdjustedSubject.attended,
                            calendarAdjustedSubject.total
                        ),
                    };
                const scenarioClasses =
                    (scenario?.attendNext ?? 0) + (scenario?.bunkNext ?? 0);
                const remainingClasses =
                    planningRemainingEstimate === undefined
                        ? undefined
                        : Math.max(
                            0,
                            planningRemainingEstimate -
                            calendarSubject.missedClassesFromBunkDays -
                            scenarioClasses
                        );
                const subject = {
                    ...calendarAdjustedSubject,
                    attended: scenarioResult.attended,
                    total: scenarioResult.total,
                };
                const plan = getAttendancePredictorPlan({
                    attended: subject.attended,
                    total: subject.total,
                    target,
                    remainingClasses,
                });

                return {
                    subject,
                    syncedSubject: baseSubject,
                    remainingClasses,
                    plan,
                    simulationActive: Boolean(scenario),
                    calendarMissedClasses: calendarSubject.missedClassesFromBunkDays,
                    calendarPredictedPercent: calendarSubject.predictedPercent,
                };
            })
            .sort((a, b) => {
                const aPercent = getAttendancePercent(
                    a.syncedSubject.attended,
                    a.syncedSubject.total
                );
                const bPercent = getAttendancePercent(
                    b.syncedSubject.attended,
                    b.syncedSubject.total
                );

                return aPercent - bPercent;
            });
    }, [
        calendarSimulation.subjects,
        planningRemainingEstimate,
        scenarios,
        subjectLookup,
        target,
    ]);

    function updateTarget(nextTarget: number) {
        const clamped = clampTarget(nextTarget);

        setTarget(clamped);
        setCustomTarget(String(clamped));
    }

    function handleCustomTargetChange(value: string) {
        setCustomTarget(value);

        if (!getTargetError(value) && value.trim() !== "") {
            setTarget(clampTarget(value));
        }
    }

    function handleAddBlockedDate() {
        setBlockedDateError("");

        if (!blockedDateInput) {
            setBlockedDateError("Choose a blocked date first.");
            return;
        }

        if (!semesterEndDate || semesterError) {
            setBlockedDateError("Set a valid semester end date before blocking dates.");
            return;
        }

        if (blockedDateInput < todayKey || blockedDateInput > semesterEndDate) {
            setBlockedDateError("Blocked dates must be between today and semester end.");
            return;
        }

        if (effectiveBlockedDateKeys.includes(blockedDateInput)) {
            setBlockedDateError("This date is already blocked/non-teaching.");
            return;
        }

        setBlockedDateKeys((current) => sortDateKeys([...current, blockedDateInput]));
        setBunkDateKeys((current) =>
            current.filter((dateKey) => dateKey !== blockedDateInput)
        );
        setBlockedDateInput("");
    }

    function toggleBunkDate(dateKey: string) {
        const blockedSet = new Set(effectiveBlockedDateKeys);
        const selected = bunkDateKeys.includes(dateKey);

        if (selected) {
            setBunkDateKeys((current) =>
                current.filter((currentDateKey) => currentDateKey !== dateKey)
            );
            return;
        }

        if (
            !semesterEndDate ||
            semesterError ||
            dateKey < todayKey ||
            dateKey > semesterEndDate ||
            blockedSet.has(dateKey)
        ) {
            return;
        }

        setBunkDateKeys((current) => sortDateKeys([...current, dateKey]));
    }

    function handleManualSubmit(payload: AttendancePredictorFormPayload) {
        const subject: PredictorAttendanceSubject = {
            id: payload.id ?? createSubjectId(),
            name: payload.name,
            code: payload.code,
            attended: payload.attended,
            total: payload.total,
            remainingClasses: payload.remainingClasses,
        };

        setManualSubjects((current) => [subject, ...current]);
    }

    function applyScenario(
        subjectId: string,
        attendNext: number,
        bunkNext: number
    ) {
        setScenarios((current) => {
            const baseSubject = subjectLookup.get(subjectId);
            if (!baseSubject) return current;

            const currentScenario = current[subjectId];

            return {
                ...current,
                [subjectId]: {
                    attendNext: (currentScenario?.attendNext ?? 0) + attendNext,
                    bunkNext: (currentScenario?.bunkNext ?? 0) + bunkNext,
                },
            };
        });
    }

    function resetPredictorSettings() {
        setTarget(75);
        setCustomTarget("75");
        setSemesterEndDate("");
        setCalendarPrefillApplied(false);
        setBlockedDateInput("");
        setBlockedDateError("");
        setBlockedDateKeys([]);
        setDefaultRemainingClasses("");
        setFallbackClassesPerBunkDay("3");
        setBunkDateKeys([]);
        setScenarios({});
    }

    function handleManualSyncedAttendanceChange(
        subjectKey: string,
        attended: number,
        total: number
    ) {
        setManualSubjectAttendance(subjectKey, attended, total);
    }

    return (
        <div className="space-y-6">
            {showLivePlanningTools && (
                <>
                    <AttendancePredictorSetup
                        target={target}
                        customTarget={customTarget}
                        targetError={targetError}
                        semesterEndDate={semesterEndDate}
                        semesterError={semesterError}
                        remainingCalendarDays={remainingDays.totalDays}
                        remainingAcademicDays={remainingDays.academicDays}
                        calendarModeLabel={calendarModeLabel}
                        calendarBlockedCount={calendarBlockedDateKeys.length}
                        calendarName={calendar?.name || "PESU Academy"}
                        calendarStatus={calendar?.calendarStatus || "unknown"}
                        calendarEndDate={calendarEndDate}
                        calendarSyncedAt={syncedAt}
                        sundayExcluded
                        blockedDateInput={blockedDateInput}
                        blockedDateError={blockedDateError}
                        blockedDateKeys={blockedDateKeys}
                        defaultRemainingClasses={defaultRemainingClasses}
                        defaultRemainingClassesError={defaultRemainingClassesError}
                        fallbackClassesPerBunkDay={fallbackClassesPerBunkDay}
                        fallbackClassesPerBunkDayError={fallbackClassesPerBunkDayError}
                        onPresetTarget={updateTarget}
                        onCustomTargetChange={handleCustomTargetChange}
                        onSemesterEndDateChange={setSemesterEndDate}
                        onBlockedDateInputChange={setBlockedDateInput}
                        onAddBlockedDate={handleAddBlockedDate}
                        onRemoveBlockedDate={(dateKey) => {
                            setBlockedDateKeys((current) =>
                                current.filter((item) => item !== dateKey)
                            );
                        }}
                        onDefaultRemainingClassesChange={setDefaultRemainingClasses}
                        onFallbackClassesPerBunkDayChange={setFallbackClassesPerBunkDay}
                        onReset={resetPredictorSettings}
                    />

                    <BunkCalendar
                        semesterEndDate={semesterEndDate}
                        blockedDateKeys={effectiveBlockedDateKeys}
                        selectedDateKeys={validBunkDateKeys}
                        onToggleDate={toggleBunkDate}
                        onClear={() => setBunkDateKeys([])}
                    />
                </>
            )}

            <section className="rounded-[1.8rem] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            Subject Predictions
                        </p>

                        <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                            {showLivePlanningTools
                                ? "Live attendance risk list"
                                : "Manual what-if subjects"}
                        </h2>

                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                            {showLivePlanningTools
                                ? "Sorted by lowest current attendance first."
                                : "PESU attendance is unavailable, so only per-subject manual what-if prediction is shown."}
                            {syncedAt && showLivePlanningTools
                                ? ` Synced ${new Date(syncedAt).toLocaleString()}.`
                                : ""}
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        <Database size={14} />
                        {dataLabel}
                    </div>
                </div>

                {subjectPlans.length > 0 ? (
                    <motion.div
                        variants={staggerContainer(0.06)}
                        initial="initial"
                        animate="animate"
                        className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2"
                    >
                        {subjectPlans.map((item) => (
                            <AttendanceSubjectPredictorCard
                                key={item.subject.id}
                                subject={item.subject}
                                syncedSubject={item.syncedSubject}
                                plan={item.plan}
                                target={target}
                                remainingClasses={item.remainingClasses}
                                calendarMissedClasses={item.calendarMissedClasses}
                                calendarPredictedPercent={item.calendarPredictedPercent}
                                simulationActive={item.simulationActive}
                                dataLabel={dataLabel}
                                manualMode={isManualFallback && hasSyncedSubjects}
                                whatIfOnly={!showLivePlanningTools}
                                onManualAttendanceChange={handleManualSyncedAttendanceChange}
                                onApplyScenario={applyScenario}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <div className="mt-5 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-6 text-center">
                        <p className="font-black text-slate-300">
                            No predictor subjects yet
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            Add a manual subject below to start what-if prediction.
                        </p>
                    </div>
                )}
            </section>

            {!hasSyncedSubjects && (
                <ManualFallbackPanel
                    manualCount={manualSubjects.length}
                    onSubmit={handleManualSubmit}
                    onClear={() => {
                        setManualSubjects([]);
                        setScenarios({});
                    }}
                />
            )}

            {showLivePlanningTools && (
                <>
                    <AttendanceBunkSummary
                        currentAverage={calendarSimulation.averageBefore}
                        predictedAverage={calendarSimulation.averageAfter}
                        totalBunkDays={calendarSimulation.totalBunkDays}
                        totalMissedClasses={calendarSimulation.totalMissedClasses}
                        safeCount={calendarPlanSummary.safeCount}
                        warningCount={calendarPlanSummary.warningCount}
                        dangerCount={calendarPlanSummary.dangerCount}
                        unrecoverableCount={calendarPlanSummary.unrecoverableCount}
                        biggestDropSubject={calendarPlanSummary.biggestDropSubject}
                        approximateMode={approximateMode}
                        remainingWorkingDays={remainingDays.academicDays}
                        calendarModeLabel={calendarModeLabel}
                        totalEstimatedRemainingClasses={totalEstimatedRemainingClasses}
                    />

                    <AttendancePredictorSummary
                        average={baselineSummary.average}
                        subjectCount={activeSubjects.length}
                        safeCount={baselineSummary.safeCount}
                        warningCount={baselineSummary.warningCount}
                        dangerCount={baselineSummary.dangerCount}
                        totalSkips={baselineSummary.totalSkips}
                        totalNeeded={baselineSummary.totalNeeded}
                        target={target}
                        lowestSubject={baselineSummary.lowest}
                    />
                </>
            )}
        </div>
    );
}

function ManualFallbackPanel({
    manualCount,
    onSubmit,
    onClear,
}: {
    manualCount: number;
    onSubmit: (subject: AttendancePredictorFormPayload) => void;
    onClear: () => void;
}) {
    return (
        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AttendancePredictorForm
                key="manual-fallback"
                editingSubject={null}
                onSubmit={onSubmit}
                onCancelEdit={() => undefined}
            />

            <div className="studio-card-soft p-5">
                <div className="flex items-start gap-4">
                    <StudioIconBubble icon={Database} tone="slate" />

                    <div>
                        <h2 className="text-lg font-black tracking-tight text-white">
                            Optional manual fallback
                        </h2>

                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            Use this only when live PESU attendance is unavailable.
                            Manual data is local to this browser.
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                        Manual subjects
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                        {manualCount}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClear}
                    disabled={manualCount === 0}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-300/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <RotateCcw size={16} />
                    Clear manual fallback
                </button>
            </div>
        </section>
    );
}
