export type PesuTimetableSlot = {
    id: string;
    day: string;
    dayIndex: number;
    slotOrder: number;
    time: string;
    startTime: string;
    endTime: string;
    code: string;
    subject: string;
    faculty: string;
    faculties: string[];
    type: "Lecture" | "Lab";
    room: string;
    roomId?: string;
    templateDetailsId?: string;
};

type TemplateSlot = {
    timeTableTemplateDetailsId: string;
    startTime: string;
    endTime: string;
    orderedBy: number;
    timeTableTemplateDetailsStatus: number;
};

function extractAssignedBlock(source: string, variableName: string) {
    const startPattern = new RegExp(`var\\s+${variableName}\\s*=\\s*`);
    const startMatch = source.match(startPattern);

    if (!startMatch || startMatch.index === undefined) {
        return null;
    }

    const blockStart = startMatch.index + startMatch[0].length;
    const firstChar = source[blockStart];

    const open = firstChar;
    const close = open === "[" ? "]" : open === "{" ? "}" : null;

    if (!close) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = blockStart; index < source.length; index++) {
        const char = source[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }

            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === open) depth += 1;

        if (char === close) {
            depth -= 1;

            if (depth === 0) {
                return source.slice(blockStart, index + 1);
            }
        }
    }

    return null;
}

function parseJsonAssignment<T>(source: string, variableName: string): T | null {
    const block = extractAssignedBlock(source, variableName);

    if (!block) return null;

    try {
        return JSON.parse(block) as T;
    } catch {
        return null;
    }
}

function parseDays(source: string) {
    const days = parseJsonAssignment<string[]>(source, "days");

    return days?.length
        ? days
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
}

function formatPesuTime(value: string) {
    const clean = value.trim();

    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);

    if (!match) return clean;

    return `${match[1].padStart(2, "0")}:${match[2]} ${match[3].toUpperCase()}`;
}

function extractPayload(value: string) {
    const parts = value.split("&&");

    return parts.at(-1)?.trim() ?? "";
}

function parseSubject(value: string) {
    const payload = extractPayload(value);

    const match = payload.match(/^([A-Z0-9]+(?:\([^)]+\))?)-(.+)$/);

    if (!match) {
        return {
            code: "",
            subject: payload,
        };
    }

    return {
        code: match[1].trim(),
        subject: match[2].trim(),
    };
}

function parseFaculty(value: string) {
    return extractPayload(value);
}

function getRoomId(source: string) {
    const match = source.match(/\$\("#rooms"\)\.val\((\d+)\)/);

    return match?.[1];
}

function getLastFinalizedAt(source: string) {
    const match = source.match(/displayTTLastFinalizedDate\('([^']+)'\)/);

    return match?.[1] ?? "";
}

export function parsePesuTimetableScript(source: string) {
    const templateDetails = parseJsonAssignment<TemplateSlot[]>(
        source,
        "timeTableTemplateDetailsJson"
    );

    const timetableJson = parseJsonAssignment<Record<string, string[]>>(
        source,
        "timeTableJson"
    );

    const days = parseDays(source);
    const roomId = getRoomId(source);
    const lastFinalizedAt = getLastFinalizedAt(source);

    if (!templateDetails || !timetableJson) {
        return {
            ok: false as const,
            error: "Could not find PESU timetable objects in the script.",
            timetable: [],
            days,
            roomId,
            lastFinalizedAt,
        };
    }

    const activeSlots = templateDetails
        .filter((slot) => slot.timeTableTemplateDetailsStatus === 0)
        .sort((a, b) => a.orderedBy - b.orderedBy);

    const slotMap = new Map<number, TemplateSlot>();

    activeSlots.forEach((slot) => {
        slotMap.set(slot.orderedBy, slot);
    });

    const timetable: PesuTimetableSlot[] = [];

    Object.entries(timetableJson).forEach(([key, values]) => {
        const keyMatch = key.match(/^ttDivText_(\d+)_(\d+)_/);

        if (!keyMatch) return;

        const dayIndex = Number(keyMatch[1]);
        const slotOrder = Number(keyMatch[2]);
        const slot = slotMap.get(slotOrder);

        if (!slot) return;

        const subjectEntry = values.find((value) => value.startsWith("ttSubject_"));

        if (!subjectEntry) return;

        const facultyEntries = values.filter((value) =>
            value.startsWith("ttFaculty_")
        );

        const { code, subject } = parseSubject(subjectEntry);

        const faculties = facultyEntries
            .map(parseFaculty)
            .filter(Boolean);

        const faculty = faculties.join(", ");

        const startTime = formatPesuTime(slot.startTime);
        const endTime = formatPesuTime(slot.endTime);

        const type =
            code.toUpperCase().includes("(LAB)") ||
                subject.toUpperCase().includes("LAB")
                ? "Lab"
                : "Lecture";

        timetable.push({
            id: `${dayIndex}-${slotOrder}-${code}`,
            day: days[dayIndex - 1] ?? `Day ${dayIndex}`,
            dayIndex,
            slotOrder,
            time: `${startTime} - ${endTime}`,
            startTime,
            endTime,
            code,
            subject,
            faculty,
            faculties,
            type,
            room: "-",
            roomId,
            templateDetailsId: slot.timeTableTemplateDetailsId,
        });
    });

    timetable.sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;

        return a.slotOrder - b.slotOrder;
    });

    return {
        ok: true as const,
        timetable,
        days,
        roomId,
        lastFinalizedAt,
    };
}
