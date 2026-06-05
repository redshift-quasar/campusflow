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
    calendarModeLabel: string;
    calendarBlockedCount: number;
    calendarName: string;
    calendarStatus: string;
    calendarEndDate: string;
    calendarSyncedAt: string;
    sundayExcluded: boolean;
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
    "w-full rounded-xl border border-white/[0.07] bg-white/[0.045] px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-700 focus:border-[#b7a8ff]/40 focus:bg-white/[0.065]";

export function AttendancePredictorSetup({
    target,
    customTarget,
    targetError,
    semesterEndDate,
    semesterError,
    remainingCalendarDays,
    remainingAcademicDays,
    calendarModeLabel,
    calendarBlockedCount,
    calendarName,
    calendarStatus,
    calendarEndDate,
    calendarSyncedAt,
    sundayExcluded,
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
        <section className="rounded-[1.25rem] border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Predictor Setup
                    </p>
                    <h2 className="mt-0.5 text-base font-black tracking-tight text-white">
                        Target, semester, and blocked dates
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                        Current selected target: {target}%.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                    <RotateCcw size={14} />
                    Reset predictor settings
                </button>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                    <div>
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-300">
                            <Target size={15} />
                            Target attendance
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {targetPresets.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onPresetTarget(preset)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition ${target === preset
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
                        <span className="mb-1.5 block text-xs font-bold text-slate-300">
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
                            <p className="mt-1.5 text-xs font-bold text-red-200">
                                {targetError}
                            </p>
                        )}
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-300">
                                <CalendarDays size={14} />
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
                                <p className="mt-1.5 text-xs font-bold text-red-200">
                                    {semesterError}
                                </p>
                            )}
                        </label>

                        <label>
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-300">
                                <SlidersHorizontal size={14} />
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
                                <p className="mt-1.5 text-xs font-bold text-red-200">
                                    {defaultRemainingClassesError}
                                </p>
                            )}
                        </label>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        <MiniCount label="Calendar days" value={remainingCalendarDays} />
                        <MiniCount label="Academic days" value={remainingAcademicDays} />
                        <MiniCount label="Synced blocks" value={calendarBlockedCount} />
                    </div>

                    <div className="rounded-[1rem] border border-white/[0.07] bg-white/[0.035] p-3">
                        <label>
                            <span className="mb-1.5 block text-xs font-bold text-slate-300">
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
                                    className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
                                >
                                    Add
                                </button>
                            </div>
                        </label>

                        {blockedDateError && (
                            <p className="mt-1.5 text-xs font-bold text-red-200">
                                {blockedDateError}
                            </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {blockedDateKeys.length > 0 ? (
                                blockedDateKeys.map((dateKey) => (
                                    <button
                                        key={dateKey}
                                        type="button"
                                        onClick={() => onRemoveBlockedDate(dateKey)}
                                        className="rounded-full bg-orange-300/10 px-2.5 py-1 text-[11px] font-black text-orange-100 transition hover:bg-orange-300/15"
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
                        <span className="mb-1.5 block text-xs font-bold text-slate-300">
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
                            <p className="mt-1.5 text-xs font-bold text-red-200">
                                {fallbackClassesPerBunkDayError}
                            </p>
                        )}
                    </label>

                    <div className="rounded-[1rem] border border-sky-300/15 bg-sky-300/[0.06] p-2.5">
                        <div className="flex items-start gap-2.5">
                            <div className="rounded-lg bg-sky-300/10 p-1.5 text-sky-200">
                                <Info size={13} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-100">
                                    {calendarModeLabel}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold leading-4 text-sky-100/75">
                                    {calendarModeLabel === "PESU Calendar"
                                        ? `${calendarName} synced${calendarEndDate ? ` till ${calendarEndDate}` : ""}. ${sundayExcluded ? "Sundays are excluded by default." : "Sundays are included."}`
                                        : "Choose a semester end date manually when the synced PESU calendar is unavailable or stale."}
                                </p>
                                <p className="mt-0.5 text-[10px] font-bold text-sky-100/55">
                                    Status: {calendarStatus}
                                    {calendarSyncedAt
                                        ? ` - synced ${new Date(calendarSyncedAt).toLocaleString()}`
                                        : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function MiniCount({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[1rem] border border-white/[0.06] bg-white/[0.035] p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>
            <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">
                {value}
            </p>
        </div>
    );
}
