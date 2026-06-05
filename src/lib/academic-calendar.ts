export type AcademicCalendarEventType =
    | "holiday"
    | "exam"
    | "isa"
    | "esa"
    | "vacation"
    | "semester-start"
    | "semester-end"
    | "working-day"
    | "non-instructional"
    | "blocked"
    | "event"
    | "other"
    | "unknown";

export type AcademicCalendarSource =
    | "pes-public-calendar"
    | "pesu-academy"
    | "manual"
    | "unknown";

export type AcademicCalendarDocument = {
    id: string;
    title: string;
    href: string;
    year?: string;
    program?: string;
    source: AcademicCalendarSource;
};

export type AcademicCalendarEvent = {
    id: string;
    title: string;
    date: string;
    endDate?: string;
    type: AcademicCalendarEventType;
    source?: AcademicCalendarSource;
    rawType?: string;
    description?: string;
    campus?: string;
    program?: string;
    semester?: string;
};

export type SemesterCalendar = {
    semesterId: string;
    startDate: string;
    endDate: string;
    events: AcademicCalendarEvent[];
};

export type AcademicCalendarFetchResult = {
    ok: boolean;
    source: AcademicCalendarSource;
    fetchedAt: string;
    syncedAt: string;
    semesterId: string;
    startDate: string;
    endDate: string;
    documents: AcademicCalendarDocument[];
    events: AcademicCalendarEvent[];
    message?: string;
};