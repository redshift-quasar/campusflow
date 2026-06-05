"use client";

import {
    CalendarDays,
    Info,
    RotateCcw,
    SlidersHorizontal,
    Target,
} from "lucide-react";

type AttendancePredictorSetupProps = {
    target: number;
    customTarget: string;
    targetError: string;
    semesterEndDate: string;
    semesterError: string;
    remainingCalendarDays: number;
    remainingAcademicDays: number;
    blockedDateInput: string;
    blockedDateError: string;
    blockedDateKeys: string[];
    defaultRemainingClasses: string;
    defaultRemainingClassesError: string;
    fallbackClassesPerBunkDay: string;
    fallbackClassesPerBunkDayError: string;
    onPresetTarget: (target: number) => void;
    onCustomTargetChange: (value: string) => void;
    onSemesterEndDateChange: (value: string) => void;
    onBlockedDateInputChange: (value: string) => void;
    onAddBlockedDate: () => void;
    onRemoveBlockedDate: (dateKey: string) => void;
    onDefaultRemainingClassesChange: (value: string) => void;
    onFallbackClassesPerBunkDayChange: (value: string) => void;
    onReset: () => void;
};

const targetPresets = [75, 80, 85, 90];

const inputClass =
    "w-full rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-700 focus:border-[#b7a8ff]/40 focus:bg-white/[0.065]";

export function AttendancePredictorSetup({
    target,
    customTarget,
    targetError,
    semesterEndDate,
    semesterError,
    remainingCalendarDays,
    remainingAcademicDays,
    blockedDateInput,
    blockedDateError,
    blockedDateKeys,
    defaultRemainingClasses,
    defaultRemainingClassesError,
    fallbackClassesPerBunkDay,
    fallbackClassesPerBunkDayError,
    onPresetTarget,
    onCustomTargetChange,
    onSemesterEndDateChange,
    onBlockedDateInputChange,
    onAddBlockedDate,
    onRemoveBlockedDate,
    onDefaultRemainingClassesChange,
    onFallbackClassesPerBunkDayChange,
    onReset,
}: AttendancePredictorSetupProps) {
    return (
        <section className="rounded-[1.8rem] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Predictor Setup
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                        Target, semester, and blocked dates
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Current selected target: {target}%.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.055] px-4 py-3 text-sm font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                    <RotateCcw size={16} />
                    Reset predictor settings
                </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300">
                            <Target size={15} />
                            Target attendance
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {targetPresets.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onPresetTarget(preset)}
                                    className={`rounded-2xl px-4 py-3 text-sm font-black transition ${target === preset
                                        ? "bg-white text-slate-950"
                                        : "bg-white/[0.055] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                        }`}
                                >
                                    {preset}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <label>
                        <span className="mb-2 block text-sm font-bold text-slate-300">
                            Custom target
                        </span>
                        <input
                            value={customTarget}
                            onChange={(event) =>
                                onCustomTargetChange(event.target.value)
                            }
                            type="number"
                            min={1}
                            max={100}
                            className={inputClass}
                            placeholder="75"
                        />
                        {targetError && (
                            <p className="mt-2 text-xs font-bold text-red-200">
                                {targetError}
                            </p>
                        )}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300">
                                <CalendarDays size={15} />
                                Semester end date
                            </span>
                            <input
                                value={semesterEndDate}
                                onChange={(event) =>
                                    onSemesterEndDateChange(event.target.value)
                                }
                                type="date"
                                className={inputClass}
                            />
                            {semesterError && (
                                <p className="mt-2 text-xs font-bold text-red-200">
                                    {semesterError}
                                </p>
                            )}
                        </label>

                        <label>
                            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-300">
                                <SlidersHorizontal size={15} />
                                Default remaining classes
                            </span>
                            <input
                                value={defaultRemainingClasses}
                                onChange={(event) =>
                                    onDefaultRemainingClassesChange(event.target.value)
                                }
                                type="number"
                                min={0}
                                className={inputClass}
                                placeholder="Use academic days"
                            />
                            {defaultRemainingClassesError && (
                                <p className="mt-2 text-xs font-bold text-red-200">
                                    {defaultRemainingClassesError}
                                </p>
                            )}
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <MiniCount label="Calendar days" value={remainingCalendarDays} />
                        <MiniCount label="Academic days" value={remainingAcademicDays} />
                    </div>

                    <div className="rounded-[1.45rem] border border-white/[0.07] bg-white/[0.035] p-4">
                        <label>
                            <span className="mb-2 block text-sm font-bold text-slate-300">
                                Blocked / non-teaching date
                            </span>
                            <div className="flex gap-2">
                                <input
                                    value={blockedDateInput}
                                    onChange={(event) =>
                                        onBlockedDateInputChange(event.target.value)
                                    }
                                    type="date"
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={onAddBlockedDate}
                                    className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff]"
                                >
                                    Add
                                </button>
                            </div>
                        </label>

                        {blockedDateError && (
                            <p className="mt-2 text-xs font-bold text-red-200">
                                {blockedDateError}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {blockedDateKeys.length > 0 ? (
                                blockedDateKeys.map((dateKey) => (
                                    <button
                                        key={dateKey}
                                        type="button"
                                        onClick={() => onRemoveBlockedDate(dateKey)}
                                        className="rounded-full bg-orange-300/10 px-3 py-1 text-xs font-black text-orange-100 transition hover:bg-orange-300/15"
                                    >
                                        {dateKey} ×
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs font-semibold text-slate-600">
                                    No blocked dates added.
                                </p>
                            )}
                        </div>
                    </div>

                    <label>
                        <span className="mb-2 block text-sm font-bold text-slate-300">
                            Fallback classes per bunk day
                        </span>
                        <input
                            value={fallbackClassesPerBunkDay}
                            onChange={(event) =>
                                onFallbackClassesPerBunkDayChange(event.target.value)
                            }
                            type="number"
                            min={0}
                            className={inputClass}
                            placeholder="3"
                        />
                        {fallbackClassesPerBunkDayError && (
                            <p className="mt-2 text-xs font-bold text-red-200">
                                {fallbackClassesPerBunkDayError}
                            </p>
                        )}
                    </label>

                    <div className="rounded-[1.35rem] border border-sky-300/15 bg-sky-300/[0.06] p-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-sky-300/10 p-2 text-sky-200">
                                <Info size={15} />
                            </div>
                            <p className="text-xs font-semibold leading-5 text-sky-100/75">
                                Academic calendar auto-detection for holidays, ISA, ESA,
                                and semester-end days will be added later.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function MiniCount({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>
            <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
                {value}
            </p>
        </div>
    );
}
