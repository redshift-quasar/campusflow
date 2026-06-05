"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { parseDateKey, toDateKey } from "@/lib/attendance-calendar";

type BunkCalendarProps = {
    semesterEndDate: string;
    blockedDateKeys: string[];
    selectedDateKeys: string[];
    onToggleDate: (dateKey: string) => void;
    onClear: () => void;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthDays(monthDate: Date) {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const days: Array<Date | null> = [];

    for (let index = 0; index < first.getDay(); index += 1) {
        days.push(null);
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
        days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }

    return days;
}

export function BunkCalendar({
    semesterEndDate,
    blockedDateKeys,
    selectedDateKeys,
    onToggleDate,
    onClear,
}: BunkCalendarProps) {
    const todayKey = toDateKey(new Date());
    const semesterEnd = semesterEndDate ? parseDateKey(semesterEndDate) : null;
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date();

        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const blockedSet = useMemo(
        () => new Set(blockedDateKeys),
        [blockedDateKeys]
    );
    const selectedSet = useMemo(
        () => new Set(selectedDateKeys),
        [selectedDateKeys]
    );
    const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
    const canUseCalendar = Boolean(semesterEnd && semesterEndDate >= todayKey);
    const monthLabel = visibleMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    function changeMonth(delta: number) {
        setVisibleMonth(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + delta, 1)
        );
    }

    function getDisabledReason(dateKey: string) {
        if (!canUseCalendar) return "Pick a valid semester end date first";
        if (dateKey < todayKey) return "Past date";
        if (semesterEndDate && dateKey > semesterEndDate) return "After semester end";
        if (blockedSet.has(dateKey)) return "Blocked date";

        return "";
    }

    return (
        <section className="rounded-[1.8rem] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Bunk Calendar
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                        Select planned bunk dates
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        You selected {selectedDateKeys.length} bunk day
                        {selectedDateKeys.length === 1 ? "" : "s"}.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClear}
                    disabled={selectedDateKeys.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.055] px-4 py-3 text-sm font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <X size={16} />
                    Clear
                </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/[0.06] bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.055] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="inline-flex items-center gap-2 text-sm font-black text-white">
                        <CalendarDays size={16} className="text-[#d7ceff]" />
                        {monthLabel}
                    </div>

                    <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.055] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                        aria-label="Next month"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                    {weekdayLabels.map((label) => (
                        <div key={label}>{label}</div>
                    ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                    {monthDays.map((date, index) => {
                        if (!date) return <div key={`blank-${index}`} />;

                        const dateKey = toDateKey(date);
                        const selected = selectedSet.has(dateKey);
                        const disabledReason = getDisabledReason(dateKey);
                        const blocked = blockedSet.has(dateKey);

                        return (
                            <button
                                key={dateKey}
                                type="button"
                                disabled={Boolean(disabledReason)}
                                title={disabledReason || dateKey}
                                onClick={() => onToggleDate(dateKey)}
                                className={`aspect-square rounded-2xl text-sm font-black transition ${selected
                                    ? "bg-red-300 text-slate-950 shadow-lg shadow-red-300/20"
                                    : blocked
                                        ? "bg-orange-300/10 text-orange-200"
                                        : disabledReason
                                            ? "cursor-not-allowed bg-white/[0.025] text-slate-700"
                                            : "bg-white/[0.055] text-slate-300 hover:bg-white/[0.09] hover:text-white"
                                    }`}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {selectedDateKeys.length > 0 ? (
                    selectedDateKeys.map((dateKey) => (
                        <button
                            key={dateKey}
                            type="button"
                            onClick={() => onToggleDate(dateKey)}
                            className="rounded-full bg-red-300/10 px-3 py-1 text-xs font-black text-red-100 transition hover:bg-red-300/15"
                        >
                            {dateKey} ×
                        </button>
                    ))
                ) : (
                    <p className="text-xs font-semibold text-slate-600">
                        Pick dates in the calendar to simulate planned bunk days.
                    </p>
                )}
            </div>
        </section>
    );
}
