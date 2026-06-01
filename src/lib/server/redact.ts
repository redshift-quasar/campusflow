import "server-only";

const SECRET_KEY_PATTERNS = [
    "token",
    "access",
    "refresh",
    "session",
    "cookie",
    "password",
    "authorization",
    "auth",
    "jwt",
];

export function redactSensitiveData(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => redactSensitiveData(item));
    }

    if (value && typeof value === "object") {
        const output: Record<string, unknown> = {};

        for (const [key, nestedValue] of Object.entries(value)) {
            const lowerKey = key.toLowerCase();

            const shouldRedact = SECRET_KEY_PATTERNS.some((pattern) =>
                lowerKey.includes(pattern)
            );

            output[key] = shouldRedact
                ? "[REDACTED]"
                : redactSensitiveData(nestedValue);
        }

        return output;
    }

    return value;
}

export function getTopLevelKeys(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return [];
    }

    return Object.keys(value);
}