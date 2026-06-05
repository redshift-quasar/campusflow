"use client";

import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
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
        advice: "High risk — prioritize this subject",
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
    onApplyScenario,
}: AttendanceSubjectPredictorCardProps) {
    const tone = toneConfig[plan.status];
    const StatusIcon = tone.icon;
    const mainMessage =
        plan.percent >= target
            ? `You can bunk ${plan.remainingSkips} ${classWord(plan.remainingSkips)}`
            : `Attend next ${plan.classesNeeded} ${classWord(plan.classesNeeded)}`;
    const unrecoverable =
        remainingClasses !== undefined && !plan.isRecoverable;

    return (
        <motion.article
            variants={cardMotion}
            className={`group relative overflow-hidden rounded-[1.7rem] border p-4 shadow-2xl shadow-black/15 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06] ${unrecoverable ? "border-red-300/45 bg-red-300/[0.07] ring-1 ring-red-300/20" : tone.border}`}
        >
            <div
                className={`absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${tone.glow}`}
            />

            <div className="relative z-10 grid gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                    {subject.code || "No code"}
                                </span>

                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.chip}`}
                                >
                                    <StatusIcon size={12} />
                                    {tone.label}
                                </span>

                                {simulationActive && (
                                    <span className="rounded-full bg-sky-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-200">
                                        Simulated
                                    </span>
                                )}
                            </div>

                            <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-tight text-white">
                                {subject.name}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                {subject.attended}/{subject.total} classes • {dataLabel}
                            </p>

                            {simulationActive && syncedSubject && (
                                <p className="mt-1 text-xs font-bold text-slate-600">
                                    Synced PESU baseline: {syncedSubject.attended}/
                                    {syncedSubject.total}
                                </p>
                            )}
                        </div>

                        <div className="text-left sm:text-right">
                            <p className="text-4xl font-black tracking-[-0.055em] text-white">
                                {plan.percent}%
                            </p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                                Target {target}%
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <StudioProgressBar value={plan.percent} tone={tone.progress} />
                    </div>

                    <div className="mt-5 rounded-[1.35rem] border border-white/[0.06] bg-black/15 p-4">
                        <p className="text-sm font-black text-white">{mainMessage}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                            {unrecoverable
                                ? `Needs ${plan.classesNeeded} classes, but only ${remainingClasses} remaining.`
                                : plan.isRecoverable
                                    ? tone.advice
                                    : "Not recoverable with current remaining classes"}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                            {unrecoverable
                                ? "Target may be impossible without extra classes/adjustment."
                                : plan.advice}
                        </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
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
        <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-3">
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}
                >
                    <Icon size={15} />
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    {label}
                </p>
            </div>

            <p className="mt-3 text-sm font-black leading-5 text-white">{value}</p>
        </div>
    );
}
