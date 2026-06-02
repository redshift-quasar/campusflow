"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Armchair,
    Building2,
    CalendarDays,
    Clock3,
    DoorOpen,
    FileText,
    MapPin,
    Search,
    TicketCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { usePesuSeating } from "@/lib/hooks/use-pesu-seating";
import type { ExamSeat } from "@/lib/demo-data";
import { normalizeSearch } from "@/lib/academic-utils";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioSectionHeader,
} from "@/components/studio/Studio";

type Tone = "blue" | "green" | "orange" | "violet" | "red" | "slate";

export default function SeatingPage() {
    const { user } = useLocalAuth();

    const displayName = user?.name ?? user?.srn ?? "Student";

    const [query, setQuery] = useState("");
    const [selectedExamId, setSelectedExamId] = useState("");

    const {
        seating: seatingExams,
        source,
        usingDemoData,
        loading,
        error,
        syncedAt,
    } = usePesuSeating();

    const isPesuLive = source === "pesu";

    useEffect(() => {
        if (!seatingExams.length) {
            setSelectedExamId("");
            return;
        }

        const selectedStillExists = seatingExams.some(
            (exam) => exam.id === selectedExamId
        );

        if (!selectedExamId || !selectedStillExists) {
            setSelectedExamId(seatingExams[0].id);
        }
    }, [selectedExamId, seatingExams]);

    const filteredExams = useMemo(() => {
        const normalizedQuery = normalizeSearch(query);

        if (!normalizedQuery) return seatingExams;

        return seatingExams.filter((exam) => {
            const searchable = normalizeSearch(
                `${exam.exam} ${exam.subject} ${exam.code} ${exam.room} ${exam.block} ${exam.seat}`
            );

            return searchable.includes(normalizedQuery);
        });
    }, [query, seatingExams]);

    const selectedExam =
        seatingExams.find((exam) => exam.id === selectedExamId) ??
        filteredExams[0] ??
        seatingExams[0];

    return (
        <DashboardShell
            title="Exam Seating"
            subtitle={`Seat details for ${displayName}`}
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge="CampusFlow / Seating"
                        title="Find your seat,"
                        mutedTitle="without chaos."
                        description="Your exam room, block, terminal number, and upcoming paper details are organized in a clean seating workspace."
                    >
                        <SeatingHeroCard exam={selectedExam} />
                    </StudioHero>
                </motion.div>

                <motion.section
                    variants={staggerContainer(0.08)}
                    initial="initial"
                    animate="animate"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <MetricCard
                        label={isPesuLive ? "PESU Records" : "Seating Records"}
                        value={loading ? "--" : seatingExams.length}
                        detail={
                            isPesuLive
                                ? "Live seating records synced"
                                : usingDemoData
                                    ? "Demo seating fallback"
                                    : "No live seating found"
                        }
                        icon={FileText}
                        tone="violet"
                    />

                    <MetricCard
                        label="Selected Exam"
                        value={selectedExam?.exam ?? "--"}
                        detail={selectedExam?.subject ?? "No exam selected"}
                        icon={TicketCheck}
                        tone="green"
                    />

                    <MetricCard
                        label="Room / Block"
                        value={selectedExam?.block ?? "--"}
                        detail={selectedExam?.room ?? "Room not selected"}
                        icon={Building2}
                        tone="blue"
                    />

                    <MetricCard
                        label={isPesuLive ? "Terminal" : "Seat"}
                        value={selectedExam?.seat ?? "--"}
                        detail={isPesuLive ? "Assigned terminal number" : "Assigned seat number"}
                        icon={Armchair}
                        tone="orange"
                    />
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <StudioSectionHeader
                                        eyebrow="Seating List"
                                        title="Exam Seat Cards"
                                    />

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-black ${isPesuLive
                                                ? "bg-emerald-300/10 text-emerald-200"
                                                : usingDemoData
                                                    ? "bg-orange-300/10 text-orange-200"
                                                    : "bg-red-300/10 text-red-200"
                                                }`}
                                        >
                                            {isPesuLive
                                                ? "PESU Live"
                                                : usingDemoData
                                                    ? "Demo Data"
                                                    : "Seating Missing"}
                                        </span>

                                        {syncedAt ? (
                                            <span className="rounded-full bg-white/[0.055] px-3 py-1 text-xs font-bold text-slate-500">
                                                Synced {new Date(syncedAt).toLocaleString()}
                                            </span>
                                        ) : null}
                                    </div>

                                    {error ? (
                                        <p className="text-xs font-semibold text-red-200">
                                            {error}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="relative w-full sm:w-80">
                                    <Search
                                        size={16}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                                    />

                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search subject, room, terminal..."
                                        className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.045] py-3 pl-11 pr-4 text-sm font-semibold text-white outline-none backdrop-blur-xl transition placeholder:text-slate-600 focus:border-white/[0.14] focus:bg-white/[0.07]"
                                    />
                                </div>
                            </div>

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3"
                            >
                                {filteredExams.length > 0 ? (
                                    filteredExams.map((exam) => (
                                        <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            active={selectedExam?.id === exam.id}
                                            isPesuLive={isPesuLive}
                                            onClick={() => setSelectedExamId(exam.id)}
                                        />
                                    ))
                                ) : (
                                    <motion.div
                                        variants={cardMotion}
                                        className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-6 text-center backdrop-blur-2xl"
                                    >
                                        <p className="text-sm font-black text-slate-300">
                                            {loading
                                                ? "Loading seating records..."
                                                : "No seating record found"}
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-slate-600">
                                            Try searching by subject, course code, room, block, or
                                            terminal number.
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.section>
                    </main>

                    <aside className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-400">
                                        {isPesuLive ? "Selected Terminal" : "Selected Seat"}
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                                        {selectedExam?.seat ?? "--"}
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {selectedExam?.subject ?? "Select an exam"}{" "}
                                        {selectedExam?.code ? `• ${selectedExam.code}` : ""}
                                    </p>
                                </div>

                                <StudioIconBubble icon={Armchair} tone="orange" />
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <StudioMini label="Exam" value={selectedExam?.exam ?? "--"} />
                                <StudioMini
                                    label={isPesuLive ? "Terminal" : "Room"}
                                    value={selectedExam?.seat ?? "--"}
                                />
                                <StudioMini label="Block" value={selectedExam?.block ?? "--"} />
                                <StudioMini label="Time" value={selectedExam?.time ?? "--"} />
                                <StudioMini
                                    label="Date"
                                    value={selectedExam?.date ?? "--"}
                                    wide
                                />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Exam Checklist
                            </h2>

                            <div className="mt-4 space-y-3">
                                <ChecklistRow
                                    icon={TicketCheck}
                                    label={isPesuLive ? "Verify terminal number" : "Verify seat number"}
                                    detail={selectedExam?.seat ?? "Select exam"}
                                    tone="green"
                                />

                                <ChecklistRow
                                    icon={DoorOpen}
                                    label="Reach room early"
                                    detail={selectedExam?.block ?? "Room not selected"}
                                    tone="blue"
                                />

                                <ChecklistRow
                                    icon={Clock3}
                                    label="Check reporting time"
                                    detail={selectedExam?.time ?? "Time not selected"}
                                    tone="orange"
                                />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <h2 className="text-lg font-black tracking-tight">
                                Location Summary
                            </h2>

                            <div className="mt-4 space-y-3">
                                <InfoChip
                                    label="Block"
                                    value={selectedExam?.block ?? "--"}
                                    icon={Building2}
                                    tone="violet"
                                />

                                <InfoChip
                                    label={isPesuLive ? "Terminal" : "Room"}
                                    value={selectedExam?.seat ?? "--"}
                                    icon={MapPin}
                                    tone="blue"
                                />

                                <InfoChip
                                    label="Date"
                                    value={selectedExam?.date ?? "--"}
                                    icon={CalendarDays}
                                    tone="green"
                                />
                            </div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

function SeatingHeroCard({ exam }: { exam?: ExamSeat }) {
    return (
        <div className="studio-card-soft p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Terminal / Seat
                    </p>

                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-5xl font-black tracking-[-0.06em]">
                            {exam?.seat ?? "--"}
                        </p>
                    </div>
                </div>

                <StudioIconBubble icon={Armchair} tone="orange" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <StudioMini label="Location" value={exam ? getExamLocationText(exam) : "--"} />
                <StudioMini label="Terminal" value={exam?.seat ?? "--"} />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
                {exam
                    ? `${exam.exam} • ${exam.subject} • ${exam.date}`
                    : "Select an exam to view seating details."}
            </p>
        </div>
    );
}
function getExamLocationText(exam: ExamSeat) {
    const block = exam.block?.trim();
    const room = exam.room?.trim();

    if (!block && !room) return "--";
    if (!block) return room;
    if (!room) return block;

    if (block.toLowerCase() === room.toLowerCase()) {
        return block;
    }

    return `${block} • ${room}`;
}

function ExamCard({
    exam,
    active,
    isPesuLive,
    onClick,
}: {
    exam: ExamSeat;
    active: boolean;
    isPesuLive: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            type="button"
            variants={cardMotion}
            onClick={onClick}
            className={`group relative overflow-hidden rounded-[1.5rem] border p-4 text-left shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 ${active
                ? "border-orange-300/25 bg-orange-300/[0.08]"
                : "border-white/[0.07] bg-white/[0.035] hover:bg-white/[0.06]"
                }`}
        >
            <div
                className={`absolute -right-14 -top-14 h-32 w-32 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${active ? "bg-orange-300/20" : "bg-[#795be6]/15"
                    }`}
            />

            <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            {exam.code}
                        </p>

                        <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${active
                                ? "bg-orange-300/10 text-orange-200"
                                : "bg-white/[0.055] text-slate-400"
                                }`}
                        >
                            {exam.exam}
                        </span>
                    </div>

                    <h3 className="mt-2 truncate font-black tracking-tight text-white">
                        {exam.subject}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {exam.date} • {exam.time}
                    </p>
                </div>

                <div className="grid gap-2 text-right">
                    <div className="rounded-2xl bg-white/[0.055] px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                            {isPesuLive ? "Terminal" : "Seat"}
                        </p>

                        <p className="mt-1 text-sm font-black text-white">{exam.seat}</p>
                    </div>

                    <p className="text-xs font-bold text-slate-600">
                        {getExamLocationText(exam)}
                    </p>
                </div>
            </div>
        </motion.button>
    );
}

function ChecklistRow({
    icon,
    label,
    detail,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    detail: string;
    tone: Tone;
}) {
    const Icon = icon;
    const toneClasses = getToneClasses(tone);

    return (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <div
                className={`absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${toneClasses.glow}`}
            />

            <div className="relative z-10 flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses.icon}`}
                >
                    <Icon size={18} />
                </div>

                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-300">{label}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                        {detail}
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoChip({
    icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone: Tone;
}) {
    const Icon = icon;
    const toneClasses = getToneClasses(tone);

    return (
        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-4">
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses.icon}`}
                >
                    <Icon size={18} />
                </div>

                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                        {label}
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-slate-300">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function getToneClasses(tone: Tone) {
    const toneClasses = {
        blue: {
            glow: "bg-sky-300/20",
            icon: "bg-sky-300/10 text-sky-200",
        },
        green: {
            glow: "bg-emerald-300/20",
            icon: "bg-emerald-300/10 text-emerald-200",
        },
        orange: {
            glow: "bg-orange-300/20",
            icon: "bg-orange-300/10 text-orange-200",
        },
        violet: {
            glow: "bg-[#795be6]/25",
            icon: "bg-[#795be6]/15 text-[#d7ceff]",
        },
        red: {
            glow: "bg-red-300/20",
            icon: "bg-red-300/10 text-red-200",
        },
        slate: {
            glow: "bg-white/[0.08]",
            icon: "bg-white/[0.055] text-slate-300",
        },
    };

    return toneClasses[tone];
}