import "server-only";

import { MOCK_STUDY_MATERIAL_CATALOG } from "@/lib/pesu/study-materials";
import type {
    StudyMaterial,
    StudyMaterialCatalog,
    StudyMaterialType,
} from "@/lib/pesu/study-materials";

type MaterialsCatalogFetcherInput = {
    username: string;
    password: string;
    semester?: string | number;
};

type MaterialsCatalogSource = "mock" | "pesuacademy" | "mock-fallback";

type MaterialsCatalogFetcherResult =
    | {
          ok: true;
          source: MaterialsCatalogSource;
          catalog: StudyMaterialCatalog;
          warnings: string[];
      }
    | {
          ok: false;
          error: string;
      };

const MATERIALS_FALLBACK_WARNING =
    "Real PESU material extraction failed, using fallback catalog.";

const VALID_MATERIAL_TYPES = new Set<StudyMaterialType>([
    "pdf",
    "ppt",
    "doc",
    "link",
    "unknown",
]);

export async function getMockStudyMaterialCatalog() {
    return MOCK_STUDY_MATERIAL_CATALOG;
}

function getPythonPath() {
    return process.env.CAMPUSFLOW_PYTHON_PATH || "python3";
}

function getMaterialsFetcherTimeoutMs() {
    const rawValue = Number(process.env.CAMPUSFLOW_MATERIALS_TIMEOUT_MS);

    if (Number.isFinite(rawValue) && rawValue > 0) {
        return rawValue;
    }

    return 25_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object";
}

function isStudyMaterialType(value: unknown): value is StudyMaterialType {
    return typeof value === "string" && VALID_MATERIAL_TYPES.has(value as StudyMaterialType);
}

function isStudyMaterial(value: unknown): value is StudyMaterial {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.subjectCode === "string" &&
        typeof value.subjectName === "string" &&
        typeof value.unit === "string" &&
        typeof value.title === "string" &&
        (value.description === undefined || typeof value.description === "string") &&
        isStudyMaterialType(value.type) &&
        (value.source === undefined ||
            value.source === "mock" ||
            value.source === "pesuacademy") &&
        (value.sizeLabel === undefined || typeof value.sizeLabel === "string") &&
        (value.uploadedAt === undefined || typeof value.uploadedAt === "string")
    );
}

function isStudyMaterialCatalog(value: unknown): value is StudyMaterialCatalog {
    if (!isRecord(value)) return false;

    return (
        Array.isArray(value.subjects) &&
        value.subjects.every(
            (subject) =>
                isRecord(subject) &&
                typeof subject.code === "string" &&
                typeof subject.name === "string" &&
                Array.isArray(subject.units) &&
                subject.units.every((unit) => typeof unit === "string")
        ) &&
        Array.isArray(value.materials) &&
        value.materials.every(isStudyMaterial)
    );
}

function isMaterialsCatalogSource(value: unknown): value is MaterialsCatalogSource {
    return value === "mock" || value === "pesuacademy" || value === "mock-fallback";
}

function isMaterialsCatalogFetcherResult(
    value: unknown
): value is MaterialsCatalogFetcherResult {
    if (!isRecord(value)) return false;

    if (value.ok === false) {
        return typeof value.error === "string";
    }

    return (
        value.ok === true &&
        isMaterialsCatalogSource(value.source) &&
        isStudyMaterialCatalog(value.catalog) &&
        Array.isArray(value.warnings) &&
        value.warnings.every((warning) => typeof warning === "string")
    );
}

function createMockFallbackResult(): MaterialsCatalogFetcherResult {
    return {
        ok: true,
        source: "mock-fallback",
        catalog: MOCK_STUDY_MATERIAL_CATALOG,
        warnings: [MATERIALS_FALLBACK_WARNING],
    };
}

function toPublicStudyMaterialCatalog(catalog: StudyMaterialCatalog): StudyMaterialCatalog {
    return {
        subjects: catalog.subjects.map((subject) => ({
            code: subject.code,
            name: subject.name,
            units: subject.units,
        })),
        materials: catalog.materials.map((material) => ({
            id: material.id,
            subjectCode: material.subjectCode,
            subjectName: material.subjectName,
            unit: material.unit,
            title: material.title,
            description: material.description,
            type: material.type,
            source: material.source,
            sizeLabel: material.sizeLabel,
            uploadedAt: material.uploadedAt,
        })),
    };
}

function toMaterialsCatalogFetcherResult(
    result: MaterialsCatalogFetcherResult
): MaterialsCatalogFetcherResult {
    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        source: result.source,
        catalog: toPublicStudyMaterialCatalog(result.catalog),
        warnings: result.warnings,
    };
}

function redactDebugOutput(
    value: string,
    { username, password }: MaterialsCatalogFetcherInput
) {
    let redacted = value;

    if (password) {
        redacted = redacted.split(password).join("[redacted-password]");
    }

    if (username) {
        redacted = redacted.split(username).join("[redacted-username]");
    }

    redacted = redacted.replace(
        /\b(password|token|csrf|cookie|session)\b\s*[:=]\s*['"]?[^'"\s>]+/gi,
        "$1=[redacted]"
    );
    redacted = redacted.replace(/[A-Za-z0-9+/=_\-.]{48,}/g, "[redacted-token]");

    return redacted.slice(0, 4000);
}

function logPythonDebug(stderr: string, input: MaterialsCatalogFetcherInput) {
    if (!stderr.trim() || process.env.NODE_ENV === "production") {
        return;
    }

    console.warn("[campusflow-materials]", redactDebugOutput(stderr, input));
}

export async function runMaterialsCatalogFetcher(
    input: MaterialsCatalogFetcherInput
): Promise<MaterialsCatalogFetcherResult> {
    const { spawn } = await import("node:child_process");

    return new Promise((resolve) => {
        const child = spawn(getPythonPath(), ["scripts/campusflow_materials.py", "catalog"], {
            stdio: ["pipe", "pipe", "pipe"],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: "1",
            },
        });

        let stdout = "";
        let stderr = "";
        let didSettle = false;
        let timedOut = false;

        function settle(result: MaterialsCatalogFetcherResult) {
            if (didSettle) return;

            didSettle = true;
            clearTimeout(timeout);
            resolve(result);
        }

        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, getMaterialsFetcherTimeoutMs());

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();

            if (stdout.length > 1_000_000) {
                child.kill("SIGKILL");
            }
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();

            if (stderr.length > 100_000) {
                stderr = stderr.slice(-100_000);
            }
        });

        child.on("error", () => {
            settle(createMockFallbackResult());
        });

        child.on("close", (code) => {
            logPythonDebug(stderr, input);

            if (timedOut || code !== 0) {
                settle(createMockFallbackResult());
                return;
            }

            try {
                const parsed = JSON.parse(stdout || "{}") as unknown;

                if (!isMaterialsCatalogFetcherResult(parsed)) {
                    settle(createMockFallbackResult());
                    return;
                }

                settle(toMaterialsCatalogFetcherResult(parsed));
            } catch {
                settle(createMockFallbackResult());
            }
        });

        child.stdin.write(
            JSON.stringify({
                username: input.username,
                password: input.password,
                semester: input.semester,
            })
        );
        child.stdin.end();
    });
}

export async function prepareMockMaterialMerge(materialIds: string[]) {
    return {
        ok: true,
        message: "Merge pipeline ready",
        materialIds,
        selectedCount: materialIds.length,
    };
}
