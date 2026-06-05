"use client";

import { useMemo, useState } from "react";
import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    X,
} from "lucide-react";

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
    const [isOpen, setIsOpen] = useState(false);
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
        <section className="rounded-[1.25rem] border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Bunk Calendar
                    </p>
                    <h2 className="mt-0.5 text-base font-black tracking-tight text-white">
                        Select planned bunk dates
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                        You selected {selectedDateKeys.length} bunk day
                        {selectedDateKeys.length === 1 ? "" : "s"}.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
                    >
                        <CalendarDays size={14} />
                        {isOpen ? "Minimize calendar" : "Select bunk days"}
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                        type="button"
                        onClick={onClear}
                        disabled={selectedDateKeys.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        <X size={14} />
                        Clear
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="mt-3 w-full rounded-[1rem] border border-white/[0.06] bg-black/10 p-2.5 sm:max-w-[21rem]">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.055] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <div className="inline-flex items-center gap-2 text-xs font-black text-white">
                            <CalendarDays size={14} className="text-[#d7ceff]" />
                            {monthLabel}
                        </div>

                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.055] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                            aria-label="Next month"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-[0.1em] text-slate-600">
                        {weekdayLabels.map((label) => (
                            <div key={label}>{label}</div>
                        ))}
                    </div>

                    <div className="mt-1.5 grid grid-cols-7 gap-1">
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
                                    className={`aspect-square rounded-lg text-[11px] font-black transition ${selected
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
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
                {selectedDateKeys.length > 0 ? (
                    selectedDateKeys.map((dateKey) => (
                        <button
                            key={dateKey}
                            type="button"
                            onClick={() => onToggleDate(dateKey)}
                            className="rounded-full bg-red-300/10 px-2.5 py-1 text-[11px] font-black text-red-100 transition hover:bg-red-300/15"
                        >
                            {dateKey} ×
                        </button>
                    ))
                ) : (
                    <p className="text-xs font-semibold text-slate-600">
                        Calendar is minimized. Use Select bunk days to open it.
                    </p>
                )}
            </div>
        </section>
    );
}
