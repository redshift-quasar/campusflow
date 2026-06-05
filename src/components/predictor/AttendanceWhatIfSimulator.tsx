"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Play, RotateCcw } from "lucide-react";

import {
    getAttendancePercent,
    getAttendancePredictorPlan,
    simulateAttendanceScenario,
} from "@/lib/academic-utils";
import type { PredictorAttendanceSubject } from "@/lib/attendance-predictor";

type AttendanceWhatIfSimulatorProps = {
    subject: PredictorAttendanceSubject;
    target: number;
    remainingClasses?: number;
    onApply: (attendNext: number, bunkNext: number) => void;
};

const inputClass =
    "w-full rounded-xl border border-white/[0.07] bg-white/[0.045] px-3 py-1.5 text-sm font-black text-white outline-none transition placeholder:text-slate-700 focus:border-sky-300/30 focus:bg-white/[0.065]";

function parseClassCount(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
}

function getInputError(label: string, value: string) {
    if (value.trim() === "") return "";

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return `${label} must be a valid number.`;
    if (parsed < 0) return `${label} cannot be negative.`;
    if (!Number.isInteger(parsed)) return `${label} must be a whole number.`;
    if (parsed > 300) return `${label} is too high for a safe simulation.`;

    return "";
}

export function AttendanceWhatIfSimulator({
    subject,
    target,
    remainingClasses,
    onApply,
}: AttendanceWhatIfSimulatorProps) {
    const [attendNext, setAttendNext] = useState("0");
    const [bunkNext, setBunkNext] = useState("0");

    const attendCount = parseClassCount(attendNext);
    const bunkCount = parseClassCount(bunkNext);
    const attendError = getInputError("Attend next", attendNext);
    const bunkError = getInputError("Bunk next", bunkNext);
    const scenarioExceedsRemaining =
        remainingClasses !== undefined &&
        attendCount + bunkCount > remainingClasses;
    const scenario = useMemo(
        () =>
            simulateAttendanceScenario(
                subject.attended,
                subject.total,
                attendCount,
                bunkCount
            ),
        [attendCount, bunkCount, subject.attended, subject.total]
    );
    const remainingAfterScenario =
        remainingClasses === undefined
            ? undefined
            : Math.max(0, remainingClasses - attendCount - bunkCount);
    const scenarioPlan = getAttendancePredictorPlan({
        attended: scenario.attended,
        total: scenario.total,
        target,
        remainingClasses: remainingAfterScenario,
    });
    const currentPercent = getAttendancePercent(subject.attended, subject.total);
    const difference = Number((scenario.percent - currentPercent).toFixed(2));
    const scenarioError =
        attendError ||
        bunkError ||
        (scenarioExceedsRemaining
            ? "Scenario exceeds estimated remaining classes."
            : "");
    const canApply = attendCount + bunkCount > 0 && !scenarioError;
    const statusClass =
        scenarioPlan.status === "safe"
            ? "bg-emerald-300/10 text-emerald-200"
            : scenarioPlan.status === "warning"
                ? "bg-orange-300/10 text-orange-200"
                : "bg-red-300/10 text-red-200";
    const statusLabel =
        scenarioPlan.status === "safe"
            ? "Safe"
            : scenarioPlan.status === "warning"
                ? "Warning"
                : "Danger";

    function applyScenario() {
        if (!canApply) return;

        onApply(attendCount, bunkCount);
        setAttendNext("0");
        setBunkNext("0");
    }

    return (
        <div className="rounded-[0.95rem] border border-white/[0.06] bg-white/[0.035] p-2.5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                        What-if
                    </p>
                    <p className="mt-0.5 text-xs font-black text-white">
                        Scenario simulator
                    </p>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass}`}
                >
                    <CheckCircle2 size={12} />
                    {statusLabel}
                </span>
            </div>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <label>
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                        Attend next
                    </span>
                    <input
                        value={attendNext}
                        onChange={(event) => setAttendNext(event.target.value)}
                        type="number"
                        min={0}
                        className={inputClass}
                    />
                </label>

                <label>
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                        Bunk next
                    </span>
                    <input
                        value={bunkNext}
                        onChange={(event) => setBunkNext(event.target.value)}
                        type="number"
                        min={0}
                        className={inputClass}
                    />
                </label>
            </div>

            {scenarioError && (
                <p className="mt-3 text-xs font-bold leading-5 text-red-200">
                    {scenarioError}
                </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2">
                <div>
                    <p className="text-xs font-bold text-slate-500">
                        New attendance
                    </p>
                    <p className="mt-0.5 text-lg font-black tracking-[-0.04em] text-white">
                        {scenario.percent}%
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                        {scenario.attended}/{scenario.total} classes
                    </p>
                    <p
                        className={`mt-1 text-xs font-black ${difference < 0
                            ? "text-red-200"
                            : difference > 0
                                ? "text-emerald-200"
                                : "text-slate-600"
                            }`}
                    >
                        {difference > 0 ? "+" : ""}
                        {difference}% from current
                    </p>
                </div>

                <p className="max-w-[10rem] text-right text-[11px] font-bold leading-4 text-slate-500">
                    {scenarioPlan.status === "safe"
                        ? `Stays above ${target}%.`
                        : scenarioPlan.advice}
                </p>
            </div>

            <p className="mt-2 text-[10px] font-bold leading-4 text-slate-600">
                Simulation only - your saved attendance is unchanged.
            </p>

            <div className="mt-2.5 flex gap-2">
                <button
                    type="button"
                    onClick={applyScenario}
                    disabled={!canApply}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <Play size={14} />
                    Apply scenario
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setAttendNext("0");
                        setBunkNext("0");
                    }}
                    className="inline-flex items-center justify-center rounded-2xl bg-white/[0.055] px-4 py-2.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                    aria-label="Reset what-if scenario"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
}
