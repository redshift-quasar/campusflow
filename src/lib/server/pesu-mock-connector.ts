import "server-only";
import { attendanceSubjects } from "@/lib/demo-data";
import type { PesuConnector } from "@/lib/server/pesu-types";

export const mockPesuConnector: PesuConnector = {
    async login({ srn, password }) {
        if (!srn.trim() || !password.trim()) {
            throw new Error("SRN and password are required");
        }

        return {
            srn: srn.trim().toUpperCase(),
            sessionToken: `mock-pesu-session-${Date.now()}`,
        };
    },

    async attendance(sessionToken) {
        return {
            source: sessionToken ? "connected-mock-pesuacademy" : "mock-pesuacademy",
            syncedAt: new Date().toISOString(),
            subjects: attendanceSubjects.map((subject) => ({
                name: subject.name,
                code: subject.code,
                faculty: subject.faculty,
                attended: subject.attended,
                total: subject.total,
            })),
        };
    },

    async calendar(sessionToken) {
        return {
            semesterId: sessionToken ? "connected-sem3" : "sem3",
            startDate: "2026-01-20",
            endDate: "2026-05-15",
            events: [
                {
                    id: "holiday-1",
                    title: "Republic Day",
                    date: "2026-01-26",
                    type: "holiday",
                },
                {
                    id: "holiday-2",
                    title: "Maha Shivaratri",
                    date: "2026-02-15",
                    type: "holiday",
                },
                {
                    id: "exam-week-1",
                    title: "ISA-1 Week",
                    date: "2026-03-09",
                    endDate: "2026-03-14",
                    type: "exam",
                },
                {
                    id: "holiday-3",
                    title: "Ugadi",
                    date: "2026-03-19",
                    type: "holiday",
                },
                {
                    id: "exam-week-2",
                    title: "ISA-2 Week",
                    date: "2026-04-20",
                    endDate: "2026-04-25",
                    type: "exam",
                },
                {
                    id: "semester-end",
                    title: "Last Instructional Day",
                    date: "2026-05-15",
                    type: "other",
                },
            ],
        };
    },
};