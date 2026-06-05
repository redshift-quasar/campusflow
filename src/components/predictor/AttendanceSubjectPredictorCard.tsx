"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    ShieldCheck,
    TrendingUp,
    Umbrella,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AttendanceWhatIfSimulator } from "@/components/predictor/AttendanceWhatIfSimulator";
import { StudioProgressBar } from "@/components/studio/Studio";
import {
    type AttendancePredictorPlan,
    type AttendanceTone,
} from "@/lib/academic-utils";
import type { PredictorAttendanceSubject } from "@/lib/attendance-predictor";
import { cardMotion } from "@/lib/motion";

type AttendanceSubjectPredictorCardProps = {
    subject: PredictorAttendanceSubject;
    syncedSubject?: PredictorAttendanceSubject;
    plan: AttendancePredictorPlan;
    target: number;
    remainingClasses?: number;
    calendarMissedClasses: number;
    calendarPredictedPercent: number;
    simulationActive?: boolean;
    dataLabel: string;
    manualMode?: boolean;
    whatIfOnly?: boolean;
    onManualAttendanceChange?: (
        subjectKey: string,
        attended: number,
        total: number
    ) => void;
    onApplyScenario: (
        subjectId: string,
        attendNext: number,
        bunkNext: number
    ) => void;
};

const toneConfig: Record<
    AttendanceTone,
    {
        label: string;
        icon: LucideIcon;
        border: string;
        chip: string;
        glow: string;
        progress: "green" | "orange" | "red";
        advice: string;
    }
> = {
    safe: {
        label: "Safe",
        icon: ShieldCheck,
        border: "border-emerald-300/18 bg-emerald-300/[0.045]",
        chip: "bg-emerald-300/10 text-emerald-200",
        glow: "bg-emerald-300/20",
        progress: "green",
        advice: "Safe for now",
    },
    warning: {
        label: "Warning",
        icon: AlertTriangle,
        border: "border-orange-300/20 bg-orange-300/[0.045]",
        chip: "bg-orange-300/10 text-orange-200",
        glow: "bg-orange-300/20",
        progress: "orange",
        advice: "Close to target",
    },
    danger: {
        label: "Danger",
        icon: AlertTriangle,
        border: "border-red-300/22 bg-red-300/[0.05]",
        chip: "bg-red-300/10 text-red-200",
        glow: "bg-red-300/20",
        progress: "red",
        advice: "High risk - prioritize this subject",
    },
};

function classWord(count: number) {
    return count === 1 ? "class" : "classes";
}

export function AttendanceSubjectPredictorCard({
    subject,
    syncedSubject,
    plan,
    target,
    remainingClasses,
    calendarMissedClasses,
    calendarPredictedPercent,
    simulationActive = false,
    dataLabel,
    manualMode = false,
    whatIfOnly = false,
    onManualAttendanceChange,
    onApplyScenario,
}: AttendanceSubjectPredictorCardProps) {
    const baselineSubject = syncedSubject ?? subject;
    const tone = toneConfig[plan.status];
    const needsManualInput = manualMode && baselineSubject.total <= 0;
    const StatusIcon = needsManualInput ? Database : tone.icon;
    const mainMessage =
        needsManualInput
            ? "Enter attended and total classes"
            : plan.percent >= target
            ? `You can bunk ${plan.remainingSkips} ${classWord(plan.remainingSkips)}`
            : `Attend next ${plan.classesNeeded} ${classWord(plan.classesNeeded)}`;
    const unrecoverable =
        remainingClasses !== undefined && !plan.isRecoverable;
    const cardTone = needsManualInput
        ? "border-sky-300/18 bg-sky-300/[0.045]"
        : unrecoverable
            ? "border-red-300/45 bg-red-300/[0.07] ring-1 ring-red-300/20"
            : tone.border;
    const glowTone = needsManualInput ? "bg-sky-300/20" : tone.glow;
    const chipTone = needsManualInput
        ? "bg-sky-300/10 text-sky-200"
        : tone.chip;
    const statusLabel = needsManualInput ? "Manual" : tone.label;

    return (
        <motion.article
            variants={cardMotion}
            className={`group relative overflow-hidden rounded-[1.2rem] border p-2.5 shadow-lg shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06] sm:p-3 ${cardTone}`}
        >
            <div
                className={`absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${glowTone}`}
            />

            <div className="relative z-10 grid gap-2.5">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                    {subject.code || "No code"}
                                </span>

                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${chipTone}`}
                                >
                                    <StatusIcon size={12} />
                                    {statusLabel}
                                </span>

                                {simulationActive && (
                                    <span className="rounded-full bg-sky-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-200">
                                        Simulated
                                    </span>
                                )}
                            </div>

                            <h3 className="mt-1.5 line-clamp-2 text-sm font-black tracking-tight text-white">
                                {subject.name}
                            </h3>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                {baselineSubject.attended}/{baselineSubject.total} current • {dataLabel}
                            </p>

                            {(simulationActive || calendarMissedClasses > 0) && (
                                <p className="mt-1 text-xs font-bold text-slate-600">
                                    Simulated view: {subject.attended}/{subject.total} classes
                                </p>
                            )}
                        </div>

                        <div className="text-left sm:text-right">
                            <p className="text-2xl font-black tracking-[-0.055em] text-white">
                                {plan.percent}%
                            </p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                                Target {target}%
                            </p>
                        </div>
                    </div>

                    <div className="mt-2">
                        <StudioProgressBar value={plan.percent} tone={tone.progress} />
                    </div>

                    {manualMode && (
                        <ManualAttendanceInline
                            subject={baselineSubject}
                            onChange={(attended, total) =>
                                onManualAttendanceChange?.(
                                    baselineSubject.code?.trim() || baselineSubject.id,
                                    attended,
                                    total
                                )
                            }
                        />
                    )}

                    <div className="mt-2 rounded-[0.95rem] border border-white/[0.06] bg-black/15 p-2.5">
                        <p className="text-xs font-black text-white">{mainMessage}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {needsManualInput
                                ? "Manual values save locally and update predictions instantly."
                                : unrecoverable
                                ? `Needs ${plan.classesNeeded} classes, but only ${remainingClasses} remaining.`
                                : plan.isRecoverable
                                    ? tone.advice
                                    : "Not recoverable with current remaining classes"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-600">
                            {needsManualInput
                                ? "Synced PESU data is unchanged."
                                : unrecoverable
                                ? "Target may be impossible without extra classes/adjustment."
                                : plan.advice}
                        </p>
                    </div>

                    {!whatIfOnly && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                            <MiniPrediction
                                icon={Umbrella}
                                label="Missed"
                                value={String(calendarMissedClasses)}
                                tone="bg-red-300/10 text-red-200"
                            />
                            <MiniPrediction
                                icon={TrendingUp}
                                label="After plan"
                                value={`${calendarPredictedPercent}%`}
                                tone="bg-sky-300/10 text-sky-200"
                            />
                            <MiniPrediction
                                icon={CheckCircle2}
                                label="Attend all"
                                value={`${plan.projectedIfAttendAll}%`}
                                tone="bg-emerald-300/10 text-emerald-200"
                            />
                            <MiniPrediction
                                icon={AlertTriangle}
                                label="Skip all"
                                value={`${plan.projectedIfSkipAll}%`}
                                tone="bg-red-300/10 text-red-200"
                            />
                            <MiniPrediction
                                icon={TrendingUp}
                                label="Remaining"
                                value={
                                    remainingClasses === undefined
                                        ? "Not set"
                                        : String(remainingClasses)
                                }
                                tone="bg-sky-300/10 text-sky-200"
                            />
                        </div>
                    )}
                </div>

                <AttendanceWhatIfSimulator
                    subject={subject}
                    target={target}
                    remainingClasses={remainingClasses}
                    onApply={(attendNext, bunkNext) =>
                        onApplyScenario(subject.id, attendNext, bunkNext)
                    }
                />
            </div>
        </motion.article>
    );
}

function MiniPrediction({
    icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: string;
}) {
    const Icon = icon;

    return (
        <div className="rounded-[0.85rem] border border-white/[0.06] bg-white/[0.035] p-2">
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone}`}
                >
                    <Icon size={12} />
                </span>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                    {label}
                </p>
            </div>

            <p className="mt-1.5 text-[11px] font-black leading-4 text-white">{value}</p>
        </div>
    );
}

function parseManualCount(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return null;
    }

    return parsed;
}

function getManualInputError(label: string, value: string) {
    if (value.trim() === "") return `${label} is required.`;

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return `${label} must be a valid number.`;
    if (parsed < 0) return `${label} cannot be negative.`;
    if (!Number.isInteger(parsed)) return `${label} must be a whole number.`;
    if (parsed > 1000) return `${label} is too high.`;

    return "";
}

function ManualAttendanceInline({
    subject,
    onChange,
}: {
    subject: PredictorAttendanceSubject;
    onChange: (attended: number, total: number) => void;
}) {
    const [attended, setAttended] = useState(String(subject.attended));
    const [total, setTotal] = useState(String(subject.total));

    const attendedError = getManualInputError("Attended", attended);
    const totalError = getManualInputError("Total", total);
    const parsedAttended = parseManualCount(attended);
    const parsedTotal = parseManualCount(total);
    const relationError =
        parsedAttended !== null &&
            parsedTotal !== null &&
            parsedAttended > parsedTotal
            ? "Attended cannot be greater than total."
            : "";
    const error = attendedError || totalError || relationError;

    function update(nextAttended: string, nextTotal: string) {
        const nextParsedAttended = parseManualCount(nextAttended);
        const nextParsedTotal = parseManualCount(nextTotal);

        if (
            nextParsedAttended !== null &&
            nextParsedTotal !== null &&
            nextParsedAttended <= nextParsedTotal
        ) {
            onChange(nextParsedAttended, nextParsedTotal);
        }
    }

    return (
        <div className="mt-2 rounded-[0.95rem] border border-sky-300/15 bg-sky-300/[0.045] p-2.5">
            <div className="grid gap-2 sm:grid-cols-2">
                <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sky-100/70">
                        Attended
                    </span>
                    <input
                        value={attended}
                        onChange={(event) => {
                            const next = event.target.value;
                            setAttended(next);
                            update(next, total);
                        }}
                        type="number"
                        min={0}
                        step={1}
                        className="w-full rounded-xl border border-white/[0.07] bg-black/15 px-3 py-1.5 text-sm font-black text-white outline-none transition focus:border-sky-300/35"
                    />
                </label>

                <label>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-sky-100/70">
                        Total
                    </span>
                    <input
                        value={total}
                        onChange={(event) => {
                            const next = event.target.value;
                            setTotal(next);
                            update(attended, next);
                        }}
                        type="number"
                        min={0}
                        step={1}
                        className="w-full rounded-xl border border-white/[0.07] bg-black/15 px-3 py-1.5 text-sm font-black text-white outline-none transition focus:border-sky-300/35"
                    />
                </label>
            </div>

            <p
                className={`mt-2 text-xs font-bold leading-5 ${error ? "text-red-200" : "text-sky-100/70"
                    }`}
            >
                {error || "Manual mode - saved locally for this subject."}
            </p>
        </div>
    );
}
