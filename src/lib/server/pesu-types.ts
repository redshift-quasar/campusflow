import "server-only";
import type { SemesterCalendar } from "@/lib/types/academic-calendar";
import type { AttendanceSubject } from "@/lib/academic-utils";

export type PesuLoginInput = {
    srn: string;
    password: string;
};

export type PesuLoginResult = {
    srn: string;
    sessionToken: string;
};

export type PesuAttendanceResult = {
    source: string;
    syncedAt: string;
    subjects: AttendanceSubject[];
};

export type PesuConnector = {
    login: (input: PesuLoginInput) => Promise<PesuLoginResult>;
    attendance: (sessionToken?: string | null) => Promise<PesuAttendanceResult>;
    calendar: (sessionToken?: string | null) => Promise<SemesterCalendar>;
};