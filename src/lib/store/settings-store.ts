"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SettingsState = {
    attendanceTarget: number;
    semesterStartDate: string;
    semesterEndDate: string;
    useDemoData: boolean;
    notifications: boolean;
    autoSync: boolean;

    setAttendanceTarget: (target: number) => void;
    setSemesterStartDate: (date: string) => void;
    setSemesterEndDate: (date: string) => void;
    setSemesterDates: (startDate: string, endDate: string) => void;
    setUseDemoData: (value: boolean) => void;
    setNotifications: (value: boolean) => void;
    setAutoSync: (value: boolean) => void;
    resetSettings: () => void;
};

const DEFAULT_SETTINGS = {
    attendanceTarget: 75,
    semesterStartDate: "",
    semesterEndDate: "",
    useDemoData: true,
    notifications: true,
    autoSync: false,
};

function clampAttendanceTarget(target: number) {
    if (Number.isNaN(target)) return DEFAULT_SETTINGS.attendanceTarget;

    return Math.min(100, Math.max(50, Math.round(target)));
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ...DEFAULT_SETTINGS,

            setAttendanceTarget: (target) => {
                set({
                    attendanceTarget: clampAttendanceTarget(target),
                });
            },

            setSemesterStartDate: (date) => {
                set({
                    semesterStartDate: date,
                });
            },

            setSemesterEndDate: (date) => {
                set({
                    semesterEndDate: date,
                });
            },

            setSemesterDates: (startDate, endDate) => {
                set({
                    semesterStartDate: startDate,
                    semesterEndDate: endDate,
                });
            },

            setUseDemoData: (value) => {
                set({
                    useDemoData: value,
                });
            },

            setNotifications: (value) => {
                set({
                    notifications: value,
                });
            },

            setAutoSync: (value) => {
                set({
                    autoSync: value,
                });
            },

            resetSettings: () => {
                set(DEFAULT_SETTINGS);
            },
        }),
        {
            name: "campusflow_settings",
            storage: createJSONStorage(() => localStorage),
            version: 1,
        }
    )
);