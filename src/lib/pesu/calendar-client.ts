import type {
    AcademicCalendarDocument,
    AcademicCalendarFetchResult,
} from "@/lib/types/academic-calendar";
import {
    buildGoogleDocumentFetchCandidates,
    extractCalendarDocuments,
    getSemesterEndFromEvents,
    getSemesterStartFromEvents,
    parseAcademicCalendarText,
    stripGoogleHtmlToText,
} from "@/lib/pesu/calendar-parser";

const PES_CALENDAR_URL = "https://pes.edu/calendar/";

const FALLBACK_CALENDAR_DOCUMENTS: AcademicCalendarDocument[] = [
    {
        id: "ay-2025-26-jan-2025-to-may-2025-https-drive-google-com-file-d-1zukn7yyyfqqjzzhotcwipekffezf5tfx-view-usp-sharing",
        title: "AY 2025-26 (Jan 2025 to May 2025)",
        href: "https://drive.google.com/file/d/1ZUkN7YYyFQQJZZhOtCWipEkffEzf5TfX/view?usp=sharing",
        year: "2025-26",
        source: "pes-public-calendar",
    },
    {
        id: "ay-2025-26-aug-2025-to-dec-2025-ug-sem-3-5-7-9-https-docs-google-com-document-d-1faso5cqo6fikref1kafez-mdz3bfkk-s-edit-usp-sharing-038-ouid-108067722720268860594-038-rtpof-true-038-sd-true",
        title: "AY 2025-26 (Aug 2025 to Dec 2025 - UG Sem 3, 5, 7, 9)",
        href: "https://docs.google.com/document/d/1fAsO5cqo6fIkReF1KaFEz_Mdz3bfkK_s/edit?usp=sharing&ouid=108067722720268860594&rtpof=true&sd=true",
        year: "2025-26",
        program: "UG",
        source: "pes-public-calendar",
    },
    {
        id: "ay-2025-26-aug-2025-to-dec-2025-ug-sem-1-non-engg-https-docs-google-com-document-d-1s8mtrbgnoktg8vblshb6k81w5ed2ncdx-edit-usp-sharing-038-ouid-108067722720268860594-038-rtpof-true-038-sd-true",
        title: "AY 2025-26 (Aug 2025 to Dec 2025 - UG Sem 1 Non-Engg)",
        href: "https://docs.google.com/document/d/1s8MtrbGNoKTg8vblShB6k81W5eD2NCDx/edit?usp=sharing&ouid=108067722720268860594&rtpof=true&sd=true",
        year: "2025-26",
        program: "UG Non-Engg",
        source: "pes-public-calendar",
    },
    {
        id: "ay-2025-26-aug-2025-to-jan-2026-ug-sem-1-b-tech-b-arch-b-pharm-https-docs-google-com-document-d-1jgmny2xpfjalqlruqw359fwebq3zuvlq-edit-usp-sharing-038-ouid-108067722720268860594-038-rtpof-true-038-sd-true",
        title: "AY 2025-26 (Aug 2025 to Jan 2026 - UG Sem 1 B.Tech, B.Arch, B.Pharm)",
        href: "https://docs.google.com/document/d/1jGmNY2xpfjalqlrUqW359fWEbq3ZUVLQ/edit?usp=sharing&ouid=108067722720268860594&rtpof=true&sd=true",
        year: "2025-26",
        program: "B.Tech",
        source: "pes-public-calendar",
    },
];

type DocumentTextResult = {
    ok: boolean;
    text: string;
    message?: string;
};

type CalendarPageDocumentsResult = {
    documents: AcademicCalendarDocument[];
    warning?: string;
};

async function fetchTextFromCalendarDocument(
    document: AcademicCalendarDocument
): Promise<DocumentTextResult> {
    const candidates = buildGoogleDocumentFetchCandidates(document.href);

    if (candidates.length === 0) {
        return {
            ok: false,
            text: "",
            message: `Could not create a fetch URL for ${document.title}.`,
        };
    }

    const failures: string[] = [];

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate.url, {
                cache: "no-store",
                headers: {
                    "user-agent":
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CampusFlow Academic Calendar Fetcher",
                    accept:
                        candidate.kind === "html"
                            ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                            : "text/plain,text/html,*/*",
                    "accept-language": "en-US,en;q=0.9",
                },
            });

            if (!response.ok) {
                failures.push(`${candidate.label}: unavailable response`);
                continue;
            }

            const raw = await response.text();
            const text =
                candidate.kind === "html" ? stripGoogleHtmlToText(raw) : raw;

            if (text.trim().length < 50) {
                failures.push(`${candidate.label}: empty/short response`);
                continue;
            }

            return {
                ok: true,
                text,
            };
        } catch {
            failures.push(`${candidate.label}: fetch failed`);
        }
    }

    return {
        ok: false,
        text: "",
        message: `Could not fetch ${document.title}. Tried: ${failures.join(" | ")}`,
    };
}

async function fetchCalendarPageDocuments(): Promise<CalendarPageDocumentsResult> {
    try {
        const response = await fetch(PES_CALENDAR_URL, {
            cache: "no-store",
            headers: {
                "user-agent":
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CampusFlow Academic Calendar Fetcher",
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "accept-language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            return {
                documents: FALLBACK_CALENDAR_DOCUMENTS,
                warning:
                    "PES calendar page was unavailable; using known official calendar document links as fallback.",
            };
        }

        const html = await response.text();
        const documents = extractCalendarDocuments(html);

        if (documents.length === 0) {
            return {
                documents: FALLBACK_CALENDAR_DOCUMENTS,
                warning:
                    "PES calendar page loaded, but no Google calendar links were detected; using known official calendar document links as fallback.",
            };
        }

        return { documents };
    } catch {
        return {
            documents: FALLBACK_CALENDAR_DOCUMENTS,
            warning:
                "PES calendar page fetch failed; using known official calendar document links as fallback.",
        };
    }
}

function pickDefaultCalendarDocument(documents: AcademicCalendarDocument[]) {
    return (
        documents.find((document) =>
            /ug sem 1 b\.tech|b\.tech/i.test(document.title)
        ) ??
        documents.find((document) => /ug sem/i.test(document.title)) ??
        documents[0]
    );
}

export async function fetchPESPublicAcademicCalendar(
    preferredDocumentId?: string
): Promise<AcademicCalendarFetchResult> {
    const fetchedAt = new Date().toISOString();

    try {
        const { documents, warning } = await fetchCalendarPageDocuments();

        if (documents.length === 0) {
            return {
                ok: false,
                source: "pes-public-calendar",
                fetchedAt,
                syncedAt: fetchedAt,
                semesterId: "pes-public-calendar",
                startDate: "",
                endDate: "",
                documents: [],
                events: [],
                message:
                    warning ??
                    "PES calendar page fetched, but no Google calendar document links were detected.",
            };
        }

        const selectedDocument =
            documents.find((document) => document.id === preferredDocumentId) ??
            pickDefaultCalendarDocument(documents);

        if (!selectedDocument) {
            return {
                ok: false,
                source: "pes-public-calendar",
                fetchedAt,
                syncedAt: fetchedAt,
                semesterId: "pes-public-calendar",
                startDate: "",
                endDate: "",
                documents,
                events: [],
                message: "No calendar document could be selected.",
            };
        }

        const documentTextResult =
            await fetchTextFromCalendarDocument(selectedDocument);

        if (!documentTextResult.ok) {
            return {
                ok: false,
                source: "pes-public-calendar",
                fetchedAt,
                syncedAt: fetchedAt,
                semesterId: selectedDocument.id,
                startDate: "",
                endDate: "",
                documents,
                events: [],
                message:
                    [
                        warning,
                        documentTextResult.message ??
                        "Could not fetch selected academic calendar document.",
                    ]
                        .filter(Boolean)
                        .join(" "),
            };
        }

        const events = parseAcademicCalendarText(
            documentTextResult.text,
            selectedDocument
        ).sort((a, b) => a.date.localeCompare(b.date));

        const hasUsefulEvents = events.some((event) =>
            ["holiday", "isa", "esa", "semester-start", "semester-end"].includes(
                event.type
            )
        );

        return {
            ok: hasUsefulEvents,
            source: "pes-public-calendar",
            fetchedAt,
            syncedAt: fetchedAt,
            semesterId: selectedDocument.id,
            startDate: getSemesterStartFromEvents(events),
            endDate: getSemesterEndFromEvents(events),
            documents,
            events,
            message: [
                warning,
                hasUsefulEvents
                    ? `Parsed ${events.length} academic calendar events from ${selectedDocument.title}.`
                    : `Fetched ${selectedDocument.title}, but only ${events.length} footer/basic events were parsed. Main calendar table parsing needs adjustment.`,
            ]
                .filter(Boolean)
                .join(" "),
        };
    } catch {
        return {
            ok: false,
            source: "pes-public-calendar",
            fetchedAt,
            syncedAt: fetchedAt,
            semesterId: "pes-public-calendar",
            startDate: "",
            endDate: "",
            documents: FALLBACK_CALENDAR_DOCUMENTS,
            events: [],
            message: "Could not fetch PES academic calendar.",
        };
    }
}
