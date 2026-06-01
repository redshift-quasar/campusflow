import { create } from "zustand";
import { persist } from "zustand/middleware";
import { attendanceSubjects as demoAttendanceSubjects } from "@/lib/demo-data";

type AttendanceSubject = (typeof demoAttendanceSubjects)[number];

type AttendanceStore = {
    subjects: AttendanceSubject[];
    markAttended: (code: string) => void;
    markMissed: (code: string) => void;
    setSubjectAttendance: (code: string, attended: number, total: number) => void;
    resetAttendance: () => void;
};

const initialSubjects = demoAttendanceSubjects.map((subject) => ({
    ...subject,
}));

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            subjects: initialSubjects,

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
                    const safeTotal = Math.max(0, total);
                    const safeAttended = Math.min(Math.max(0, attended), safeTotal);

                    return {
                        subjects: state.subjects.map((subject) =>
                            subject.code === code
                                ? {
                                    ...subject,
                                    attended: safeAttended,
                                    total: safeTotal,
                                }
                                : subject
                        ),
                    };
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