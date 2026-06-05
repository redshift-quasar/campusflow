export type AcademicCalendarEventType =
  | "holiday"
  | "isa"
  | "esa"
  | "semester-start"
  | "semester-end"
  | "exam"
  | "event"
  | "blocked"
  | "non-instructional"
  | "vacation"
  | "working-day"
  | "other"
  | "unknown";

export type AcademicCalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: AcademicCalendarEventType;
  source?: AcademicCalendarSource;
  rawType?: string | null;
  description?: string | null;
  campus?: string;
  program?: string;
  semester?: string;
  color?: string | null;
  isHoliday?: boolean;
  isClass?: boolean;
  calendarOfEventName?: string | null;
};

export type SemesterCalendar = {
    semesterId: string;
    startDate: string;
    endDate: string;
    events: AcademicCalendarEvent[];
};
export type AcademicCalendarSource =
  | "pesu-academy"
  | "pes-public-calendar"
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


export type AcademicCalendarFetchResult = {
  ok: boolean;
  source: AcademicCalendarSource;
  fetchedAt: string;
  syncedAt?: string;
  semesterId?: string | null;
  startDate?: string;
  endDate?: string;
  calendarStatus?: "active" | "upcoming" | "past" | "unknown";
  usableForPrediction?: boolean;
  documents: AcademicCalendarDocument[];
  events: AcademicCalendarEvent[];
  message?: string;
};
