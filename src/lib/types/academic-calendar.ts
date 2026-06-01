export type AcademicCalendarEventType =
    | "holiday"
    | "exam"
    | "vacation"
    | "working-day"
    | "non-instructional"
    | "other";

export type AcademicCalendarEvent = {
    id: string;
    title: string;
    date: string;
    endDate?: string;
    type: AcademicCalendarEventType;
};

export type SemesterCalendar = {
    semesterId: string;
    startDate: string;
    endDate: string;
    events: AcademicCalendarEvent[];
};