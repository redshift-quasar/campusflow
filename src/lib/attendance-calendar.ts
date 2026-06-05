export function toDateKey(date: Date): string {
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date | null {
    const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );

    return Number.isNaN(date.getTime()) ? null : date;
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return [];
    }

    const start = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
    );
    const end = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
    );

    if (end < start) return [];

    const dates: Date[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

export function isSameDateKey(a: string, b: string): boolean {
    return a === b;
}

export function getRemainingCalendarDays({
    fromDate,
    semesterEndDate,
    blockedDateKeys = [],
    excludeWeekends = false,
}: {
    fromDate: Date;
    semesterEndDate: Date;
    blockedDateKeys?: string[];
    excludeWeekends?: boolean;
}): {
    totalDays: number;
    academicDays: number;
    dateKeys: string[];
} {
    const dates = getDateRange(fromDate, semesterEndDate);
    const blockedSet = new Set(blockedDateKeys);
    const dateKeys = dates
        .filter((date) => {
            const dateKey = toDateKey(date);
            const weekend = date.getDay() === 0 || date.getDay() === 6;

            return !blockedSet.has(dateKey) && !(excludeWeekends && weekend);
        })
        .map(toDateKey)
        .filter(Boolean);

    return {
        totalDays: dates.length,
        academicDays: dateKeys.length,
        dateKeys,
    };
}
