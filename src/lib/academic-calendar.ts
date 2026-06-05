export type AcademicCalendarEvent = {
    id: string;
    title: string;
    date: string;
    type: "holiday" | "isa" | "esa" | "semester-end" | "event";
};

export function getBlockedAcademicDates(events: AcademicCalendarEvent[]): string[] {
    return events
        .filter((event) =>
            ["holiday", "isa", "esa", "event"].includes(event.type)
        )
        .map((event) => event.date)
        .filter(Boolean);
}
