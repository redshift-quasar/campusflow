"use client";

import { useMemo, useSyncExternalStore } from "react";
import { timetable as demoTimetable, timetableDays } from "@/lib/demo-data";
import {
    getPesuSyncCache,
    PESU_SYNC_CACHE_KEY,
    type SafePesuTimetable,
    type SafePesuTimetableSlot,
} from "@/lib/pesu/campusflow-pesu";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";

export type AppTimetableSlot = {
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
    type: "Lecture" | "Lab" | "Tutorial";
    room: string;
};

type PesuTimetableSnapshot = {
    slots: AppTimetableSlot[];
    days: string[];
    roomId: string;
    lastFinalizedAt: string;
    source: "pesu" | "demo";
};

export type SlotsByDay = {
    day: string;
    slots: AppTimetableSlot[];
};

const PESU_SYNC_EVENT = "campusflow_pesu_sync_changed";
const DEFAULT_DAYS = timetableDays;
const UNAVAILABLE_TEXT_PATTERN =
    /^(?:-|n\/a|na|none|null|undefined|missing|not synced|not assigned|room not synced|room not assigned|no room assigned|faculty not synced|no faculty assigned)$/i;

function getTimePart(time: string, part: "start" | "end") {
    const [start = "", end = ""] = time.split(" - ");

    return part === "start" ? start : end || start;
}

function getDayIndex(day: string) {
    const index = DEFAULT_DAYS.indexOf(day);

    return index >= 0 ? index + 1 : 1;
}

function normalizeTitle(value: string) {
    const clean = value.trim();

    if (!clean) return "";

    return clean
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => {
            if (word.length <= 3 && /^[a-z0-9()]+$/.test(word)) {
                return word.toUpperCase();
            }

            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

function cleanOptionalText(value?: string | null) {
    const clean = String(value ?? "").trim();

    if (!clean || UNAVAILABLE_TEXT_PATTERN.test(clean)) return "";

    return clean;
}

function normalizeDisplayTitle(value?: string | null) {
    return normalizeTitle(cleanOptionalText(value));
}

function normalizeType(value: string, subject: string): AppTimetableSlot["type"] {
    if (value === "Lab" || subject.toLowerCase().includes("lab")) return "Lab";
    if (value === "Tutorial") return "Tutorial";

    return "Lecture";
}

function sortSlots(slots: AppTimetableSlot[]) {
    return slots
        .slice()
        .sort((a, b) => {
            if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;

            return a.slotOrder - b.slotOrder;
        });
}

function mapDemoTimetable(): AppTimetableSlot[] {
    return sortSlots(
        demoTimetable.map((slot, index) => {
            const startTime = getTimePart(slot.time, "start");
            const endTime = slot.endTime ?? getTimePart(slot.time, "end");

            return {
                id: `demo-${slot.day}-${slot.time}-${slot.code}-${index}`,
                day: slot.day,
                dayIndex: getDayIndex(slot.day),
                slotOrder: index + 1,
                time: `${startTime} - ${endTime}`,
                startTime,
                endTime,
                code: slot.code,
                subject: slot.subject,
                faculty: slot.faculty || "-",
                faculties: slot.faculty ? [slot.faculty] : [],
                type: slot.type,
                room: slot.room,
            };
        })
    );
}

function getPesuRoomValue(slot: SafePesuTimetableSlot) {
    const room = cleanOptionalText(slot.room);

    if (!room) return "-";

    if (
        slot.roomId &&
        room.toLowerCase() === `room ${slot.roomId}`.toLowerCase()
    ) {
        return "-";
    }

    return room;
}

function mapPesuSlot(slot: SafePesuTimetableSlot, index: number): AppTimetableSlot {
    const startTime =
        cleanOptionalText(slot.startTime) ||
        (slot.time ? cleanOptionalText(getTimePart(slot.time, "start")) : "") ||
        "-";
    const endTime =
        cleanOptionalText(slot.endTime) ||
        (slot.time ? cleanOptionalText(getTimePart(slot.time, "end")) : "") ||
        "-";
    const subject = normalizeDisplayTitle(slot.subject) || "-";
    const code = cleanOptionalText(slot.code) || "-";
    const faculties = Array.isArray(slot.faculties)
        ? slot.faculties.map(normalizeDisplayTitle).filter(Boolean)
        : [];
    const faculty =
        normalizeDisplayTitle(slot.faculty) || faculties.join(", ") || "-";
    const time =
        cleanOptionalText(slot.time) ||
        (startTime !== "-" && endTime !== "-" ? `${startTime} - ${endTime}` : "-");
    const room = getPesuRoomValue(slot);

    return {
        id: slot.id || `pesu-${slot.dayIndex}-${slot.slotOrder}-${code}-${index}`,
        day: cleanOptionalText(slot.day) || `Day ${slot.dayIndex || 1}`,
        dayIndex: Number(slot.dayIndex) || getDayIndex(slot.day),
        slotOrder: Number(slot.slotOrder) || index + 1,
        time,
        startTime,
        endTime,
        code,
        subject,
        faculty,
        faculties: faculties.length ? faculties : faculty !== "-" ? [faculty] : [],
        type: normalizeType(slot.type || "Lecture", subject),
        room,
    };
}

const DEMO_SLOTS = mapDemoTimetable();

const SERVER_SNAPSHOT: PesuTimetableSnapshot = {
    slots: DEMO_SLOTS,
    days: DEFAULT_DAYS,
    roomId: "",
    lastFinalizedAt: "",
    source: "demo",
};

let cachedRawSync: string | null = null;
let cachedSnapshot: PesuTimetableSnapshot = SERVER_SNAPSHOT;

function createPesuSnapshot(
    timetable: SafePesuTimetable | null | undefined
): PesuTimetableSnapshot | null {
    if (!timetable?.slots.length) return null;

    const slots = sortSlots(timetable.slots.map(mapPesuSlot));
    const days = timetable.days?.length ? timetable.days : DEFAULT_DAYS;

    return {
        slots,
        days,
        roomId: timetable.roomId ?? "",
        lastFinalizedAt: timetable.lastFinalizedAt ?? "",
        source: "pesu",
    };
}

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(PESU_SYNC_EVENT, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(PESU_SYNC_EVENT, callback);
    };
}

function getSnapshot(): PesuTimetableSnapshot {
    if (typeof window === "undefined") return SERVER_SNAPSHOT;

    const raw = localStorage.getItem(PESU_SYNC_CACHE_KEY);

    if (raw === cachedRawSync) {
        return cachedSnapshot;
    }

    cachedRawSync = raw;

    const cache = getPesuSyncCache();
    const timetable = cache?.timetable;

    if (!timetable?.slots.length) {
        cachedSnapshot = SERVER_SNAPSHOT;
        return cachedSnapshot;
    }

    const pesuSnapshot = createPesuSnapshot(timetable);

    if (!pesuSnapshot) {
        cachedSnapshot = SERVER_SNAPSHOT;
        return cachedSnapshot;
    }

    cachedSnapshot = pesuSnapshot;

    return cachedSnapshot;
}

function getServerSnapshot(): PesuTimetableSnapshot {
    return SERVER_SNAPSHOT;
}

function getTodayName() {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long",
    });
}

export function usePesuTimetable() {
    const { timetable: serverTimetable } = usePesuSession();
    const localState = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    const state = useMemo(() => {
        return createPesuSnapshot(serverTimetable) ?? localState;
    }, [localState, serverTimetable]);

    return useMemo(() => {
        const todayName = getTodayName();
        const slots = sortSlots(state.slots);
        const todaySlots = slots.filter((slot) => slot.day === todayName);
        const slotsByDay: SlotsByDay[] = state.days.map((day) => ({
            day,
            slots: slots.filter((slot) => slot.day === day),
        }));

        return {
            slots,
            todaySlots,
            slotsByDay,
            days: state.days,
            roomId: state.roomId,
            lastFinalizedAt: state.lastFinalizedAt,
            source: state.source,
            usingDemoData: state.source !== "pesu",
        };
    }, [state]);
}
