import "server-only";
import { mockPesuConnector } from "@/lib/server/pesu-mock-connector";
import { realPesuConnector } from "@/lib/server/pesu-real-connector";
import type { PesuLoginInput } from "@/lib/server/pesu-types";

function getConnector() {
    const mode = process.env.PESU_CONNECTOR_MODE ?? "mock";

    if (mode === "real") {
        return realPesuConnector;
    }

    return mockPesuConnector;
}

export async function loginToPesuAcademy(input: PesuLoginInput) {
    return getConnector().login(input);
}

export async function fetchPesuAttendance(sessionToken?: string | null) {
    return getConnector().attendance(sessionToken);
}

export async function fetchPesuCalendar(sessionToken?: string | null) {
    return getConnector().calendar(sessionToken);
}