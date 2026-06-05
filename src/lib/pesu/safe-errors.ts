import type { SafePesuSyncResponse } from "@/lib/pesu/campusflow-pesu";

export const PESU_MISSING_CREDENTIALS_MESSAGE =
    "Enter both SRN/username and password.";

export const PESU_LOGIN_FAILURE_MESSAGE =
    "Could not connect PESUAcademy. Check your SRN and password, then try again.";

export const PESU_SYNC_FAILURE_MESSAGE =
    "Could not sync PESU data. Please try again after a moment.";

export const PESU_ATTENDANCE_FAILURE_MESSAGE =
    "Could not refresh PESU attendance. Please try again after a moment.";

type PesuSyncErrors = NonNullable<SafePesuSyncResponse["errors"]>;

const MODULE_ERROR_MESSAGES: Record<keyof PesuSyncErrors, string> = {
    attendance:
        "Attendance is not available from PESU right now. You can refresh again later.",
    courses: "Courses are not available from PESU right now.",
    timetable: "Timetable is not available from PESU right now.",
    results: "Results are not available from PESU right now.",
    seating: "Seating details are not available from PESU right now.",
    calendar: "Calendar details are not available from PESU right now.",
};

export function sanitizePesuSyncErrors(
    errors?: SafePesuSyncResponse["errors"] | null
): SafePesuSyncResponse["errors"] {
    if (!errors) return undefined;

    return {
        attendance: errors.attendance ? MODULE_ERROR_MESSAGES.attendance : null,
        courses: errors.courses ? MODULE_ERROR_MESSAGES.courses : null,
        timetable: errors.timetable ? MODULE_ERROR_MESSAGES.timetable : null,
        results: errors.results ? MODULE_ERROR_MESSAGES.results : null,
        seating: errors.seating ? MODULE_ERROR_MESSAGES.seating : null,
        calendar: errors.calendar ? MODULE_ERROR_MESSAGES.calendar : null,
    };
}
