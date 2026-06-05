import type {
    AcademicCalendarDocument,
    AcademicCalendarEvent,
    AcademicCalendarEventType,
} from "@/lib/types/academic-calendar";

const PES_CALENDAR_URL = "https://pes.edu/calendar/";

const MONTHS: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
};

const MONTH_PATTERN =
    "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

type CalendarDayCell = {
    day: number;
    marker: string;
    date: string;
};

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function decodeHtmlEntity(value: string) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&#038;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&#8217;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

export function decodeCalendarHtml(value: string) {
    return decodeHtmlEntity(value)
        .replace(/<[^>]*>/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();
}

export function toCalendarSlug(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function absolutizeCalendarUrl(href: string) {
    try {
        return new URL(href, PES_CALENDAR_URL).toString();
    } catch {
        return href;
    }
}

export function inferCalendarYear(title: string) {
    return title.match(/\b20\d{2}-\d{2}\b/)?.[0];
}

export function inferCalendarProgram(title: string) {
    const clean = title.toLowerCase();

    if (clean.includes("b.tech")) return "B.Tech";
    if (clean.includes("b.arch")) return "B.Arch";
    if (clean.includes("b.pharm")) return "B.Pharm";
    if (clean.includes("non-engg")) return "UG Non-Engg";
    if (clean.includes("ug sem")) return "UG";

    return undefined;
}

export function classifyAcademicEvent(
    title: string,
    rawType?: string
): AcademicCalendarEventType {
    const text = `${title} ${rawType ?? ""}`.toLowerCase().trim();

    if (!text) return "unknown";

    if (
        text.includes("lwd") ||
        text.includes("last working day") ||
        text.includes("semester end") ||
        text.includes("end of classes")
    ) {
        return "semester-end";
    }

    if (
        text.includes("class commencement") ||
        text.includes("semester start") ||
        text.includes("commencement of classes") ||
        text.includes("start of classes")
    ) {
        return "semester-start";
    }

    if (
        text.includes("holiday") ||
        text.includes("vacation") ||
        text.includes("break") ||
        text.includes("ganesh chaturthi") ||
        text.includes("eid") ||
        text.includes("mahanavami") ||
        text.includes("gandhi jayanthi") ||
        text.includes("vijayadashmi") ||
        text.includes("naraka chaturdashi") ||
        text.includes("balipadyami") ||
        text.includes("kannada rajyotsava")
    ) {
        return "holiday";
    }

    if (text.includes("isa") || text.includes("internal assessment")) {
        return "isa";
    }

    if (
        text.includes("esa") ||
        text.includes("end semester assessment") ||
        text.includes("end sem")
    ) {
        return "esa";
    }

    if (text.includes("exam") || text.includes("examination")) {
        return "exam";
    }

    if (
        text.includes("non-instructional") ||
        text.includes("non instructional") ||
        text.includes("non-teaching") ||
        text.includes("no class")
    ) {
        return "non-instructional";
    }

    return "event";
}

export function extractCalendarDocuments(html: string): AcademicCalendarDocument[] {
    const anchorPattern =
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    const documents: AcademicCalendarDocument[] = [];
    let match: RegExpExecArray | null;

    while ((match = anchorPattern.exec(html)) !== null) {
        const href = absolutizeCalendarUrl(match[1] ?? "");
        const title = decodeCalendarHtml(match[2] ?? "");

        const isGoogleCalendarDocument =
            /drive\.google\.com|docs\.google\.com/i.test(href);

        const looksLikeAcademicCalendar =
            isGoogleCalendarDocument &&
            /academic calendar|ay\s+\d{4}-\d{2}|calendar/i.test(title);

        if (!title || !looksLikeAcademicCalendar) continue;

        documents.push({
            id: toCalendarSlug(`${title}-${href}`),
            title,
            href,
            year: inferCalendarYear(title),
            program: inferCalendarProgram(title),
            source: "pes-public-calendar",
        });
    }

    const seen = new Set<string>();

    return documents.filter((document) => {
        const key = `${document.title}-${document.href}`;

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

export function extractGoogleDocumentId(href: string) {
    return (
        href.match(/docs\.google\.com\/document\/d\/([^/?#]+)/)?.[1] ??
        href.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ??
        href.match(/[?&]id=([^&#]+)/)?.[1] ??
        null
    );
}

export function buildGoogleDocumentFetchCandidates(href: string) {
    const id = extractGoogleDocumentId(href);

    if (!id) return [];

    const candidates: Array<{
        label: string;
        url: string;
        kind: "text" | "html";
    }> = [];

    if (href.includes("docs.google.com/document")) {
        candidates.push(
            {
                label: "google-doc-export-txt",
                url: `https://docs.google.com/document/d/${id}/export?format=txt`,
                kind: "text",
            },
            {
                label: "google-doc-mobilebasic",
                url: `https://docs.google.com/document/d/${id}/mobilebasic`,
                kind: "html",
            },
            {
                label: "google-doc-preview",
                url: `https://docs.google.com/document/d/${id}/preview`,
                kind: "html",
            }
        );
    }

    candidates.push({
        label: "google-drive-download",
        url: `https://drive.google.com/uc?export=download&id=${id}`,
        kind: "text",
    });

    return candidates;
}

export function stripGoogleHtmlToText(html: string) {
    const withBreaks = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<tr\b[^>]*>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/td>/gi, " ")
        .replace(/<\/th>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n");

    return decodeHtmlEntity(withBreaks)
        .replace(/<[^>]*>/g, " ")
        .split(/\r?\n/)
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
}

function toIsoDate(year: number, month: number, day: number) {
    const date = new Date(year, month - 1, day);

    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizeMonthName(value: string) {
    const clean = value.toLowerCase();

    if (clean.startsWith("sept")) return "sept";

    return clean.slice(0, 3);
}

function monthNumber(monthName: string) {
    return MONTHS[normalizeMonthName(monthName)] ?? null;
}

function previousMonth(month: number) {
    return month === 1 ? 12 : month - 1;
}

function inferYearsFromDocumentTitle(title: string) {
    const explicitRange = title.match(
        new RegExp(
            `\\b(${MONTH_PATTERN})\\s+(20\\d{2})\\s+to\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,
            "i"
        )
    );

    if (explicitRange) {
        return {
            startMonth: monthNumber(explicitRange[1]),
            startYear: Number(explicitRange[2]),
            endMonth: monthNumber(explicitRange[3]),
            endYear: Number(explicitRange[4]),
        };
    }

    const ayMatch = title.match(/\b(20\d{2})-(\d{2})\b/);
    const startYear = ayMatch?.[1]
        ? Number(ayMatch[1])
        : new Date().getFullYear();

    const endYear = ayMatch?.[2] ? Number(`20${ayMatch[2]}`) : startYear;

    return {
        startMonth: 8,
        startYear,
        endMonth: 7,
        endYear,
    };
}

function inferYearForMonth(month: number, documentTitle: string) {
    const range = inferYearsFromDocumentTitle(documentTitle);

    if (range.startMonth && range.endMonth && range.startMonth <= range.endMonth) {
        if (month >= range.startMonth && month <= range.endMonth) {
            return range.startYear;
        }
    }

    if (range.startMonth && range.endMonth && range.startMonth > range.endMonth) {
        if (month >= range.startMonth) return range.startYear;
        if (month <= range.endMonth) return range.endYear;
    }

    if (month >= 8) return range.startYear;

    return range.endYear;
}

function parseMonthLabel(line: string) {
    const cleaned = line.trim();

    const match = cleaned.match(
        new RegExp(
            `^(${MONTH_PATTERN})(?:\\/(${MONTH_PATTERN}))?(?:\\s+(20\\d{2}))?\\s+`,
            "i"
        )
    );

    if (!match) return null;

    const primaryMonth = monthNumber(match[1]);
    const secondaryMonth = match[2] ? monthNumber(match[2]) : null;
    const explicitYear = match[3] ? Number(match[3]) : null;

    if (!primaryMonth) return null;

    return {
        label: match[0].trim(),
        primaryMonth,
        secondaryMonth,
        explicitYear,
        rest: cleaned.slice(match[0].length).trim(),
    };
}

function tokenizeRow(rest: string) {
    return rest
        .replace(/[–—]/g, "-")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
}

function isMarkerNumber(token: string, markers: string[]) {
    const previous = markers.join(" ").toLowerCase();

    return (
        /^\d+$/.test(token) &&
        (previous.includes("isa") ||
            previous.includes("esa") ||
            previous.includes("ccm") ||
            previous.includes("fam") ||
            previous.includes("ptm"))
    );
}

function isLegendOrFooterMarker(marker: string) {
    const clean = marker.toLowerCase();

    return (
        clean.includes(":") ||
        clean.includes("faculty advisor meeting") ||
        clean.includes("in semester assessment") ||
        clean.includes("end semester assessment") ||
        clean.includes("last working day") ||
        clean.includes("parent teachers meeting") ||
        clean.includes("parent teacher meeting") ||
        clean.includes("announcement of results") ||
        clean.length > 40
    );
}

function extractDayCellsFromRow(rest: string) {
    const tokens = tokenizeRow(rest);
    const rawCells: Array<{ day: number; marker: string }> = [];

    let index = 0;

    while (index < tokens.length && rawCells.length < 6) {
        const token = tokens[index];

        if (/^\d{1,2}$/.test(token)) {
            const day = Number(token);

            if (day < 1 || day > 31) {
                index += 1;
                continue;
            }

            index += 1;

            const markers: string[] = [];

            while (index < tokens.length) {
                const nextToken = tokens[index];

                if (/^\d{1,2}$/.test(nextToken) && !isMarkerNumber(nextToken, markers)) {
                    break;
                }

                if (
                    nextToken.includes(":") ||
                    /activities?|events?/i.test(nextToken) ||
                    /\d{1,2}(?:st|nd|rd|th)?[-–—]/i.test(nextToken)
                ) {
                    break;
                }

                markers.push(nextToken);
                index += 1;
            }

            rawCells.push({
                day,
                marker: markers.join(" "),
            });

            continue;
        }

        index += 1;
    }

    const activityText = tokens
        .slice(index)
        .join(" ")
        .replace(/^\d+\s+/, "")
        .trim();

    return {
        rawCells,
        activityText,
    };
}

function buildDatedCells(
    rawCells: Array<{ day: number; marker: string }>,
    monthInfo: NonNullable<ReturnType<typeof parseMonthLabel>>,
    documentTitle: string
): CalendarDayCell[] {
    const days = rawCells.map((cell) => cell.day);
    const rolloverIndex = days.findIndex(
        (day, index) => index > 0 && day < days[index - 1]
    );

    return rawCells
        .map((cell, index) => {
            let month = monthInfo.primaryMonth;

            if (monthInfo.secondaryMonth) {
                month =
                    rolloverIndex >= 0 && index >= rolloverIndex
                        ? monthInfo.secondaryMonth
                        : monthInfo.primaryMonth;
            } else if (rolloverIndex >= 0) {
                month =
                    index >= rolloverIndex
                        ? monthInfo.primaryMonth
                        : previousMonth(monthInfo.primaryMonth);
            }

            let year = inferYearForMonth(month, documentTitle);

            if (
                monthInfo.explicitYear &&
                monthInfo.secondaryMonth &&
                month === monthInfo.secondaryMonth
            ) {
                year = monthInfo.explicitYear;
            }

            const date = toIsoDate(year, month, cell.day);

            if (!date) return null;

            return {
                day: cell.day,
                marker: cell.marker,
                date,
            };
        })
        .filter(Boolean) as CalendarDayCell[];
}

function getActivityEvents(
    activityText: string,
    cells: CalendarDayCell[],
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const events: AcademicCalendarEvent[] = [];

    const normalizedActivityText = activityText
        .replace(/\b(\d{1,2})\s+(st|nd|rd|th)\b/gi, "$1$2")
        .replace(/\s*[-–—]\s*/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const pattern =
        /(\d{1,2})(?:st|nd|rd|th)?-([^0-9]+?)(?=\s+\d{1,2}(?:st|nd|rd|th)?-|$)/gi;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(normalizedActivityText)) !== null) {
        const day = Number(match[1]);

        const title = match[2]
            .replace(/[,:;]+$/g, "")
            .replace(/\s+/g, " ")
            .trim();

        if (!title) continue;

        const cell = cells.find((candidate) => candidate.day === day);
        if (!cell) continue;

        const marker = cell.marker.toLowerCase();

        let type = classifyAcademicEvent(title);

        if (marker.includes("h") && type === "event") {
            type = "holiday";
        }

        events.push({
            id: toCalendarSlug(`${document.id}-${cell.date}-${title}`),
            title,
            date: cell.date,
            type,
            source: document.source,
            rawType: cell.marker,
            description: activityText,
            program: document.program,
            semester: document.title,
        });
    }

    return events;
}

function getCellMarkerEvents(
    cells: CalendarDayCell[],
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const events: AcademicCalendarEvent[] = [];

    for (const cell of cells) {
        const marker = cell.marker.toLowerCase();

        if (!marker) continue;
        if (isLegendOrFooterMarker(marker)) continue;

        if (/\bh\b/.test(marker)) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-holiday`),
                title: "Holiday",
                date: cell.date,
                type: "holiday",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("isa")) {
            const isaLabel = marker.includes("2") ? "ISA 2" : "ISA 1";

            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-${isaLabel}`),
                title: isaLabel,
                date: cell.date,
                type: "isa",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("esa")) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-esa`),
                title: "ESA",
                date: cell.date,
                type: "esa",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("fad")) {
            events.push({
                id: toCalendarSlug(
                    `${document.id}-${cell.date}-final-attendance-display`
                ),
                title: "Final Attendance Display",
                date: cell.date,
                type: "event",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("lwd")) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-last-working-day`),
                title: "Last Working Day",
                date: cell.date,
                type: "semester-end",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("ccm")) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-class-committee-meeting`),
                title: "Class Committee Meeting",
                date: cell.date,
                type: "event",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("fam")) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-faculty-advisor-meeting`),
                title: "Faculty Advisor Meeting",
                date: cell.date,
                type: "event",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }

        if (marker.includes("ptm")) {
            events.push({
                id: toCalendarSlug(`${document.id}-${cell.date}-parent-teacher-meeting`),
                title: "Parent Teacher Meeting",
                date: cell.date,
                type: "event",
                source: document.source,
                rawType: cell.marker,
                program: document.program,
                semester: document.title,
            });
        }
    }

    return events;
}

function getAssessmentRangeEvents(
    text: string,
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const events: AcademicCalendarEvent[] = [];
    const pattern = new RegExp(
        `\\b(ISA|ESA)\\s*\\d*\\s*[-:]?\\s*(${MONTH_PATTERN})\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\b`,
        "gi"
    );

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const label = match[1].toUpperCase();
        const month = monthNumber(match[2]);

        if (!month) continue;

        const startDay = Number(match[3]);
        const endDay = Number(match[4]);
        const year = inferYearForMonth(month, document.title);
        const date = toIsoDate(year, month, startDay);
        const endDate = toIsoDate(year, month, endDay);

        if (!date || !endDate) continue;

        events.push({
            id: toCalendarSlug(`${document.id}-${date}-${label}-range`),
            title: `${label} Period`,
            date,
            endDate,
            type: label === "ISA" ? "isa" : "esa",
            source: document.source,
            rawType: label,
            description: match[0],
            program: document.program,
            semester: document.title,
        });
    }

    return events;
}

function getColonDateEvents(
    text: string,
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const events: AcademicCalendarEvent[] = [];
    const pattern = new RegExp(
        `(Announcement of Results|Commencement of next Semester)\\s*:?\\s*(${MONTH_PATTERN})\\s+(\\d{1,2}),?\\s*(20\\d{2})`,
        "gi"
    );

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const title = match[1].trim();
        const month = monthNumber(match[2]);

        if (!month) continue;

        const day = Number(match[3]);
        const year = Number(match[4]);
        const date = toIsoDate(year, month, day);

        if (!date) continue;

        events.push({
            id: toCalendarSlug(`${document.id}-${date}-${title}`),
            title,
            date,
            type: "event",
            source: document.source,
            rawType: title,
            description: match[0],
            program: document.program,
            semester: document.title,
        });
    }

    return events;
}

function normalizeCalendarRows(text: string) {
    const flatText = text
        .replace(/\r?\n/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();

    const rowStartPattern = new RegExp(
        `\\b(${MONTH_PATTERN})(?:\\/(${MONTH_PATTERN}))?(?:\\s+(20\\d{2}))?\\s+(?=\\d{1,2}\\b)`,
        "gi"
    );

    const starts: Array<{ index: number }> = [];

    let match: RegExpExecArray | null;

    while ((match = rowStartPattern.exec(flatText)) !== null) {
        starts.push({ index: match.index });
    }

    const rows: string[] = [];

    for (let index = 0; index < starts.length; index += 1) {
        const start = starts[index].index;
        const end = starts[index + 1]?.index ?? flatText.length;
        const row = flatText.slice(start, end).trim();

        if (row) rows.push(row);
    }

    return rows.filter((row) => {
        const monthInfo = parseMonthLabel(row);
        if (!monthInfo) return false;

        const { rawCells } = extractDayCellsFromRow(monthInfo.rest);

        return rawCells.length >= 2;
    });
}

function parseCalendarRow(
    line: string,
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const monthInfo = parseMonthLabel(line);

    if (!monthInfo) return [];

    const { rawCells, activityText } = extractDayCellsFromRow(monthInfo.rest);
    const cells = buildDatedCells(rawCells, monthInfo, document.title);

    return [
        ...getCellMarkerEvents(cells, document),
        ...getActivityEvents(activityText, cells, document),
    ];
}

function isDateInsideRange(date: string, startDate: string, endDate?: string) {
    if (!endDate) return false;

    return date >= startDate && date <= endDate;
}

function dedupeCalendarEvents(events: AcademicCalendarEvent[]) {
    const rangeEvents = events.filter((event) => event.endDate);

    const withoutCoveredSingles = events.filter((event) => {
        if (event.endDate) return true;

        const coveredByRange = rangeEvents.some(
            (rangeEvent) =>
                rangeEvent.type === event.type &&
                isDateInsideRange(event.date, rangeEvent.date, rangeEvent.endDate)
        );

        if (coveredByRange && ["isa", "esa", "exam"].includes(event.type)) {
            return false;
        }

        return true;
    });

    const namedHolidayDates = new Set(
        withoutCoveredSingles
            .filter(
                (event) =>
                    event.type === "holiday" &&
                    event.title.toLowerCase() !== "holiday"
            )
            .map((event) => event.date)
    );

    const withoutGenericHolidayDuplicates = withoutCoveredSingles.filter(
        (event) => {
            const isGenericHoliday =
                event.type === "holiday" &&
                event.title.toLowerCase() === "holiday";

            return !(isGenericHoliday && namedHolidayDates.has(event.date));
        }
    );

    const seen = new Map<string, AcademicCalendarEvent>();

    for (const event of withoutGenericHolidayDuplicates) {
        const key = `${event.date}-${event.endDate ?? ""}-${event.title.toLowerCase()}`;

        if (!seen.has(key)) {
            seen.set(key, event);
        }
    }

    return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function parseAcademicCalendarText(
    text: string,
    document: AcademicCalendarDocument
): AcademicCalendarEvent[] {
    const rows = normalizeCalendarRows(text);
    const events: AcademicCalendarEvent[] = [];

    for (const row of rows) {
        events.push(...parseCalendarRow(row, document));
    }

    events.push(...getAssessmentRangeEvents(text, document));
    events.push(...getColonDateEvents(text, document));

    return dedupeCalendarEvents(events);
}

export function getSemesterEndFromEvents(events: AcademicCalendarEvent[]) {
    const explicit = [...events]
        .filter((event) => event.type === "semester-end")
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);

    if (explicit) return explicit.date;

    const lastWorkingDay = [...events]
        .filter((event) => event.title.toLowerCase().includes("last working day"))
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);

    if (lastWorkingDay) return lastWorkingDay.date;

    const sorted = [...events]
        .filter((event) => !["holiday", "isa", "esa", "exam"].includes(event.type))
        .sort((a, b) => a.date.localeCompare(b.date));

    return sorted.at(-1)?.date ?? "";
}

export function getSemesterStartFromEvents(events: AcademicCalendarEvent[]) {
    const explicit = [...events]
        .filter((event) => event.type === "semester-start")
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (explicit) return explicit.date;

    const classCommencement = [...events]
        .filter((event) =>
            event.title.toLowerCase().includes("class commencement")
        )
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (classCommencement) return classCommencement.date;

    const firstTeachingRelatedEvent = [...events]
        .filter((event) => !["holiday", "isa", "esa", "exam"].includes(event.type))
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (firstTeachingRelatedEvent) return firstTeachingRelatedEvent.date;

    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

    return sorted[0]?.date ?? "";
}

function getDateRange(startDate: string, endDate?: string) {
    if (!endDate || startDate === endDate) return [startDate];

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [startDate];
    }

    if (end < start) return [startDate];

    const dates: string[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        dates.push(
            `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(
                cursor.getDate()
            )}`
        );

        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

export function getBlockedAcademicDates(events: AcademicCalendarEvent[]) {
    return Array.from(
        new Set(
            events
                .filter((event) =>
                    [
                        "holiday",
                        "vacation",
                        "isa",
                        "esa",
                        "exam",
                        "non-instructional",
                        "blocked",
                    ].includes(event.type)
                )
                .flatMap((event) => getDateRange(event.date, event.endDate))
                .filter(Boolean)
        )
    ).sort();
}