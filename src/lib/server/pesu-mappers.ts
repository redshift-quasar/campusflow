import "server-only";
import type { AttendanceSubject } from "@/lib/academic-utils";
import type {
    AcademicCalendarEvent,
    SemesterCalendar,
} from "@/lib/types/academic-calendar";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
    return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
        const cleaned = value.replace("%", "").trim();
        const parsed = Number(cleaned);

        if (Number.isFinite(parsed)) return parsed;
    }

    return 0;
}

function getNestedValue(record: UnknownRecord, keys: string[]) {
    for (const key of keys) {
        if (key in record) return record[key];
    }

    return undefined;
}

function findFirstStringByKeyNames(value: unknown, keyNames: string[]): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findFirstStringByKeyNames(item, keyNames);
            if (found) return found;
        }

        return "";
    }

    if (!isRecord(value)) return "";

    for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();

        const keyMatches = keyNames.some((name) =>
            normalizedKey.includes(name.toLowerCase())
        );

        if (keyMatches && typeof nestedValue === "string" && nestedValue.trim()) {
            return nestedValue;
        }

        const found = findFirstStringByKeyNames(nestedValue, keyNames);
        if (found) return found;
    }

    return "";
}

function findFirstArrayByKeyNames(value: unknown, keyNames: string[]): unknown[] {
    if (Array.isArray(value)) return value;

    if (!isRecord(value)) return [];

    for (const [key, nestedValue] of Object.entries(value)) {
        const normalizedKey = key.toLowerCase();

        const keyMatches = keyNames.some((name) =>
            normalizedKey.includes(name.toLowerCase())
        );

        if (keyMatches && Array.isArray(nestedValue)) {
            return nestedValue;
        }

        const found = findFirstArrayByKeyNames(nestedValue, keyNames);
        if (found.length > 0) return found;
    }

    return [];
}

function getSubjectName(record: UnknownRecord) {
    return (
        asString(
            getNestedValue(record, [
                "name",
                "subject",
                "subjectName",
                "courseName",
                "course",
            ])
        ) || "Unknown Subject"
    );
}

function getSubjectCode(record: UnknownRecord) {
    return (
        asString(
            getNestedValue(record, [
                "code",
                "subjectCode",
                "courseCode",
                "course_code",
            ])
        ) || "UNKNOWN"
    );
}

function getFaculty(record: UnknownRecord) {
    return asString(
        getNestedValue(record, ["faculty", "facultyName", "teacher", "instructor"])
    );
}

function getAttended(record: UnknownRecord) {
    return asNumber(
        getNestedValue(record, [
            "attended",
            "present",
            "classesAttended",
            "attendedClasses",
            "presentClasses",
        ])
    );
}

function getTotal(record: UnknownRecord) {
    return asNumber(
        getNestedValue(record, [
            "total",
            "held",
            "conducted",
            "totalClasses",
            "classesHeld",
            "conductedClasses",
        ])
    );
}

export function mapPesuLoginResponse(data: unknown, fallbackSrn: string) {
    const sessionToken = findFirstStringByKeyNames(data, [
        "sessionToken",
        "accessToken",
        "authToken",
        "token",
        "jwt",
        "session",
    ]);

    if (!sessionToken) {
        throw new Error("Could not find session token in PESU login response");
    }

    const srn =
        findFirstStringByKeyNames(data, ["srn", "username", "usn", "studentId"]) ||
        fallbackSrn;

    return {
        srn: srn.trim().toUpperCase(),
        sessionToken,
    };
}

export function mapPesuAttendanceResponse(data: unknown): AttendanceSubject[] {
    const rows = findFirstArrayByKeyNames(data, [
        "subjects",
        "attendance",
        "attendanceDetails",
        "courses",
        "courseList",
        "data",
    ]);

    return rows
        .filter(isRecord)
        .map((record) => {
            const attended = getAttended(record);
            const total = getTotal(record);

            return {
                name: getSubjectName(record),
                code: getSubjectCode(record),
                faculty: getFaculty(record),
                attended,
                total: Math.max(total, attended),
            };
        })
        .filter((subject) => subject.code !== "UNKNOWN" || subject.name !== "Unknown Subject");
}

function mapCalendarEvent(value: unknown, index: number): AcademicCalendarEvent {
    if (!isRecord(value)) {
        return {
            id: `event-${index}`,
            title: "Unknown Event",
            date: "",
            type: "other",
        };
    }

    const title =
        asString(getNestedValue(value, ["title", "name", "event", "description"])) ||
        "Calendar Event";

    const date =
        asString(getNestedValue(value, ["date", "startDate", "fromDate", "start"])) ||
        "";

    const endDate = asString(
        getNestedValue(value, ["endDate", "toDate", "end"])
    );

    const rawType = asString(getNestedValue(value, ["type", "category"]));

    const normalizedType = rawType.toLowerCase();

    const type =
        normalizedType.includes("holiday") || normalizedType.includes("leave")
            ? "holiday"
            : normalizedType.includes("exam") || normalizedType.includes("isa")
                ? "exam"
                : normalizedType.includes("vacation") || normalizedType.includes("break")
                    ? "vacation"
                    : normalizedType.includes("non")
                        ? "non-instructional"
                        : "other";

    return {
        id: asString(getNestedValue(value, ["id", "eventId"])) || `event-${index}`,
        title,
        date,
        endDate: endDate || undefined,
        type,
    };
}

export function mapPesuCalendarResponse(data: unknown): SemesterCalendar {
    if (!isRecord(data)) {
        throw new Error("Invalid PESU calendar response");
    }

    const eventsArray = findFirstArrayByKeyNames(data, [
        "events",
        "calendar",
        "holidays",
        "academicCalendar",
        "data",
    ]);

    const startDate =
        asString(getNestedValue(data, ["startDate", "semesterStartDate", "start"])) ||
        "";

    const endDate =
        asString(getNestedValue(data, ["endDate", "semesterEndDate", "end"])) || "";

    return {
        semesterId:
            asString(getNestedValue(data, ["semesterId", "semester", "term"])) ||
            "current-semester",
        startDate,
        endDate,
        events: eventsArray.map(mapCalendarEvent).filter((event) => event.date),
    };
}