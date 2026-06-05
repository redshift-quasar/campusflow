import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttendanceSubject } from "@/lib/academic-utils";
import { attendanceSubjects as demoAttendanceSubjects } from "@/lib/demo-data";

export type ManualAttendanceRecord = {
    attended: number;
    total: number;
    updatedAt: string;
};

type AttendanceStore = {
    subjects: AttendanceSubject[];
    manualByCode: Record<string, ManualAttendanceRecord>;
    markAttended: (code: string) => void;
    markMissed: (code: string) => void;
    setSubjectAttendance: (code: string, attended: number, total: number) => void;
    setManualSubjectAttendance: (
        code: string,
        attended: number,
        total: number
    ) => void;
    clearManualSubjectAttendance: (code: string) => void;
    resetManualAttendance: () => void;
    resetAttendance: () => void;
};

const initialSubjects = demoAttendanceSubjects.map((subject) => ({
    ...subject,
}));

function sanitizeAttendance(attended: number, total: number) {
    const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
    const safeAttended = Math.min(
        Math.max(0, Math.floor(Number.isFinite(attended) ? attended : 0)),
        safeTotal
    );

    return {
        attended: safeAttended,
        total: safeTotal,
    };
}

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            subjects: initialSubjects,
            manualByCode: {},

            markAttended: (code) =>
                set((state) => ({
                    subjects: state.subjects.map((subject) =>
                        subject.code === code
                            ? {
                                ...subject,
                                attended: subject.attended + 1,
                                total: subject.total + 1,
                            }
                            : subject
                    ),
                })),

            markMissed: (code) =>
                set((state) => ({
                    subjects: state.subjects.map((subject) =>
                        subject.code === code
                            ? {
                                ...subject,
                                total: subject.total + 1,
                            }
                            : subject
                    ),
                })),

            setSubjectAttendance: (code, attended, total) =>
                set((state) => {
                    const sanitized = sanitizeAttendance(attended, total);

                    return {
                        subjects: state.subjects.map((subject) =>
                            subject.code === code
                                ? {
                                    ...subject,
                                    attended: sanitized.attended,
                                    total: sanitized.total,
                                }
                                : subject
                        ),
                        manualByCode: {
                            ...state.manualByCode,
                            [code]: {
                                ...sanitized,
                                updatedAt: new Date().toISOString(),
                            },
                        },
                    };
                }),

            setManualSubjectAttendance: (code, attended, total) =>
                set((state) => {
                    const sanitized = sanitizeAttendance(attended, total);

                    return {
                        manualByCode: {
                            ...state.manualByCode,
                            [code]: {
                                ...sanitized,
                                updatedAt: new Date().toISOString(),
                            },
                        },
                    };
                }),

            clearManualSubjectAttendance: (code) =>
                set((state) => {
                    const nextManual = { ...state.manualByCode };
                    delete nextManual[code];

                    return {
                        manualByCode: nextManual,
                    };
                }),

            resetManualAttendance: () =>
                set({
                    manualByCode: {},
                }),

            resetAttendance: () =>
                set({
                    subjects: initialSubjects.map((subject) => ({ ...subject })),
                }),
        }),
        {
            name: "campusflow-attendance",
        }
    )
);
