"use client";

import { useEffect, useMemo, useState } from "react";
import { exams as demoExams, type ExamSeat } from "@/lib/demo-data";

type SafePesuSeatingItem = {
    assessment: string;
    code: string;
    date: string;
    time: string;
    terminal: string;
    block: string;
    subject?: string | null;
};

type PesuSessionResponse = {
    connected?: boolean;
    source?: string;
    connectorMode?: string;
    syncedAt?: string;
    seating?: {
        items?: SafePesuSeatingItem[];
    };
    errors?: {
        seating?: string | null;
    };
};

const MONTHS: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
};

function parseExamDate(dateValue: string) {
    const cleanDate = dateValue.trim();

    const pesuMatch = cleanDate.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})$/);

    if (pesuMatch) {
        const day = Number(pesuMatch[1]);
        const month = MONTHS[pesuMatch[2].toLowerCase()];
        const year = Number(pesuMatch[3]);

        if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
            return { year, month, day };
        }
    }

    const fallback = new Date(cleanDate);

    if (!Number.isNaN(fallback.getTime())) {
        return {
            year: fallback.getFullYear(),
            month: fallback.getMonth(),
            day: fallback.getDate(),
        };
    }

    return null;
}

function parseStartTime(timeValue: string) {
    const startTime = timeValue.split(" - ")[0]?.trim() ?? "";

    const match = startTime.match(/^(\d{1,2})[-:](\d{2})\s*(AM|PM)$/i);

    if (!match) {
        return { hour: 0, minute: 0 };
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === "PM" && hour !== 12) {
        hour += 12;
    }

    if (meridiem === "AM" && hour === 12) {
        hour = 0;
    }

    return {
        hour: Number.isNaN(hour) ? 0 : hour,
        minute: Number.isNaN(minute) ? 0 : minute,
    };
}

function getExamTimestamp(exam: ExamSeat) {
    const parsedDate = parseExamDate(exam.date);

    if (!parsedDate) {
        return 0;
    }

    const parsedTime = parseStartTime(exam.time);

    return new Date(
        parsedDate.year,
        parsedDate.month,
        parsedDate.day,
        parsedTime.hour,
        parsedTime.minute
    ).getTime();
}

function sortLatestFirst(exams: ExamSeat[]) {
    return [...exams].sort((a, b) => {
        const timeDifference = getExamTimestamp(b) - getExamTimestamp(a);

        if (timeDifference !== 0) {
            return timeDifference;
        }

        return a.code.localeCompare(b.code);
    });
}

function mapPesuSeatingToExam(item: SafePesuSeatingItem, index: number): ExamSeat {
    return {
        id: `pesu-${item.code}-${item.date}-${item.time}-${item.terminal}-${index}`,
        exam: item.assessment || "PESU Assessment",
        subject: item.subject || item.code || "Course",
        code: item.code || "--",
        date: item.date || "--",
        time: item.time || "--",
        seat: item.terminal || "--",
        room: item.block || "--",
        block: item.block || "--",
    };
}

export function usePesuSeating() {
    const [session, setSession] = useState<PesuSessionResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function loadSession() {
            try {
                const response = await fetch("/api/pesu/session", {
                    cache: "no-store",
                });

                const data = (await response.json()) as PesuSessionResponse;

                if (active) {
                    setSession(data);
                }
            } catch {
                if (active) {
                    setSession(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadSession();

        return () => {
            active = false;
        };
    }, []);

    return useMemo(() => {
        const realItems = session?.seating?.items ?? [];
        const hasRealSeating = realItems.length > 0;

        if (hasRealSeating) {
            return {
                seating: sortLatestFirst(realItems.map(mapPesuSeatingToExam)),
                source: "pesu" as const,
                usingDemoData: false,
                loading,
                error: session?.errors?.seating ?? "",
                syncedAt: session?.syncedAt ?? "",
            };
        }

        return {
            seating: session?.connected ? [] : sortLatestFirst(demoExams),
            source: session?.connected ? ("missing" as const) : ("demo" as const),
            usingDemoData: !session?.connected,
            loading,
            error: session?.errors?.seating ?? "",
            syncedAt: session?.syncedAt ?? "",
        };
    }, [loading, session]);
}