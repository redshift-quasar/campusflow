"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InfoRow } from "@/components/dashboard/InfoRow";
import { PesuSyncBadge } from "@/components/layout/PesuSyncBadge";
import { useSettingsStore } from "@/lib/store/settings-store";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";
import { clearPesuSyncCache } from "@/lib/pesu/campusflow-pesu";
import {
    StudioHero,
    StudioIconBubble,
    StudioInfoBox,
    StudioSectionHeader,
    StudioToneBadge,
} from "@/components/studio/Studio";
import type { LucideIcon } from "lucide-react";
import {
    Bell,
    Database,
    KeyRound,
    Link2,
    LockKeyhole,
    LogOut,
    RefreshCw,
    ShieldCheck,
    SlidersHorizontal,
    Target,
    User2,
} from "lucide-react";

const targetOptions = [75, 85, 95];

export default function SettingsPage() {
    const target = useSettingsStore((state) => state.attendanceTarget);
    const setTarget = useSettingsStore((state) => state.setAttendanceTarget);

    const notifications = useSettingsStore((state) => state.notifications);
    const setNotifications = useSettingsStore((state) => state.setNotifications);

    const autoSync = useSettingsStore((state) => state.autoSync);
    const setAutoSync = useSettingsStore((state) => state.setAutoSync);
    const resetSettings = useSettingsStore((state) => state.resetSettings);

    const {
        session,
        isLoading,
        isSubmitting,
        error,
        connect,
        disconnect,
        refreshSession,
    } = usePesuSession();

    const profile = session.profile;

    const attendanceCount = session.attendance?.length ?? 0;
    const courseCount = session.courses?.length ?? 0;
    const timetableCount = session.timetable?.slots?.length ?? 0;
    const resultCount = session.results?.courses?.length ?? 0;
    const seatingCount = session.seating?.items?.length ?? 0;

    const dataSources = [
        {
            label: "Profile",
            status: profile ? "Live" : session.connected ? "Missing" : "Demo",
            detail: profile?.name ?? session.srn ?? "Local fallback",
        },
        {
            label: "Attendance",
            status: attendanceCount ? "Live" : session.connected ? "Missing" : "Demo",
            detail: attendanceCount ? `${attendanceCount} subjects` : "Demo fallback",
        },
        {
            label: "Courses",
            status: courseCount ? "Live" : session.connected ? "Missing" : "Demo",
            detail: courseCount ? `${courseCount} courses` : "No courses",
        },
        {
            label: "Timetable",
            status: timetableCount ? "Live" : session.connected ? "Missing" : "Demo",
            detail: timetableCount ? `${timetableCount} slots` : "Demo fallback",
        },
        {
            label: "Results",
            status: resultCount ? "Live" : session.connected ? "Missing" : "Demo",
            detail: resultCount ? `${resultCount} courses` : "Awaiting PESU result",
        },
        {
            label: "Seating",
            status: seatingCount ? "Live" : session.connected ? "Missing" : "Demo",
            detail: seatingCount ? `${seatingCount} records` : "Awaiting seating release",
        },
    ];

    const [srn, setSrn] = useState("");
    const [password, setPassword] = useState("");

    async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        await connect(srn, password);
        setPassword("");
    }

    return (
        <DashboardShell
            title="Settings"
            subtitle="Preferences, privacy, PESU sync, and account controls"
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge="Control Center"
                        title="Connect CampusFlow,"
                        mutedTitle="your way."
                        description="Manage PESU sync, attendance targets, alerts, and privacy-safe account controls from one place."
                    >
                        <SettingsHeroCard
                            isLoading={isLoading}
                            connected={session.connected}
                            srn={session.srn}
                            connectorMode={session.connectorMode}
                        />
                    </StudioHero>
                </motion.div>

                <motion.section
                    variants={staggerContainer(0.08)}
                    initial="initial"
                    animate="animate"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                    <MetricMotionCard>
                        <MetricCard
                            label="PESU Sync"
                            value={session.connected ? "Connected" : "Offline"}
                            detail={session.srn ?? "No account connected"}
                            icon={Link2}
                            tone={session.connected ? "safe" : "warning"}
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Attendance Target"
                            value={`${target}%`}
                            detail="Used for warnings"
                            icon={Target}
                            tone="primary"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Live Modules"
                            value={`${dataSources.filter((source) => source.status === "Live").length}/6`}
                            detail="Profile, attendance, timetable, results, seating"
                            icon={Database}
                            tone="violet"
                        />
                    </MetricMotionCard>

                    <MetricMotionCard>
                        <MetricCard
                            label="Privacy"
                            value="Server"
                            detail="No password in localStorage"
                            icon={ShieldCheck}
                            tone="safe"
                        />
                    </MetricMotionCard>
                </motion.section>

                <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <main className="space-y-6">
                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="PESUAcademy"
                                title="Connection"
                                detail="Server-side session"
                            />

                            <div className="mt-6 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-6 backdrop-blur-xl sm:p-8">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex gap-5">
                                        <StudioIconBubble
                                            icon={session.connected ? ShieldCheck : LockKeyhole}
                                            tone={session.connected ? "green" : "orange"}
                                        />

                                        <div>
                                            <h3 className="text-lg font-black tracking-tight">
                                                {session.connected
                                                    ? "PESUAcademy connected"
                                                    : "Connect PESUAcademy"}
                                            </h3>

                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                {session.connected
                                                    ? "CampusFlow can now use live profile, attendance, timetable, results, and seating data from the server-side PESU session."
                                                    : "Enter SRN and password. The password is used only during connect/sync and is not saved in browser storage."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                                        <PesuSyncBadge />

                                        <button
                                            onClick={refreshSession}
                                            disabled={isSubmitting}
                                            className="studio-button w-fit disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Refresh Status
                                        </button>
                                    </div>
                                </div>

                                {session.connected ? (
                                    <motion.div
                                        variants={staggerContainer(0.08)}
                                        initial="initial"
                                        animate="animate"
                                        className="mt-8 space-y-5"
                                    >
                                        <motion.div variants={cardMotion} className="studio-card-soft p-5 sm:p-6 space-y-1">
                                            <InfoRow label="Status" value="Connected" />
                                            <InfoRow label="SRN" value={session.srn ?? "-"} />
                                            <InfoRow
                                                label="Connector"
                                                value={session.connectorMode ?? "none"}
                                            />
                                            <InfoRow
                                                label="Last sync"
                                                value={
                                                    session.syncedAt
                                                        ? new Date(session.syncedAt).toLocaleString()
                                                        : "Not synced"
                                                }
                                            />
                                            <InfoRow label="Session" value="HTTP-only cookie" />
                                            <InfoRow label="Password stored" value="No" />
                                        </motion.div>

                                        <motion.button
                                            variants={cardMotion}
                                            onClick={disconnect}
                                            disabled={isSubmitting}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-red-300/20 bg-red-300/10 px-5 py-3.5 text-sm font-black text-red-100 transition duration-300 hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <LogOut size={16} />
                                            Disconnect PESUAcademy
                                        </motion.button>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleConnect} className="mt-8 space-y-6">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div>
                                                <label
                                                    htmlFor="pesuSrn"
                                                    className="mb-2 block text-sm font-bold text-slate-300"
                                                >
                                                    SRN / Username
                                                </label>

                                                <input
                                                    id="pesuSrn"
                                                    value={srn}
                                                    onChange={(event) => setSrn(event.target.value)}
                                                    placeholder="PES2UG24CS000"
                                                    className="studio-input w-full"
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="pesuPassword"
                                                    className="mb-2 block text-sm font-bold text-slate-300"
                                                >
                                                    Password
                                                </label>

                                                <input
                                                    id="pesuPassword"
                                                    value={password}
                                                    onChange={(event) => setPassword(event.target.value)}
                                                    placeholder="PESUAcademy password"
                                                    type="password"
                                                    className="studio-input w-full"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-5 py-4 text-sm font-bold text-red-100">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 transition duration-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Link2 size={16} />
                                            {isSubmitting ? "Connecting..." : "Connect PESUAcademy"}
                                        </button>

                                        <p className="text-xs leading-6 text-slate-500">
                                            The password is used for this connect request only.
                                            CampusFlow stores only the safe normalized sync result in
                                            the server session.
                                        </p>
                                    </form>
                                )}
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Preferences"
                                title="Academic Settings"
                                detail="Personalize calculations"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 space-y-5"
                            >
                                <SettingBlock
                                    icon={Target}
                                    title="Attendance Target"
                                    description="Choose the minimum percentage you want to maintain in every subject."
                                >
                                    <AttendanceTargetControl
                                        value={target}
                                        onChange={setTarget}
                                    />
                                </SettingBlock>

                                <SettingBlock
                                    icon={Bell}
                                    title="Alerts"
                                    description="Control attendance warnings, exam reminders, and schedule updates."
                                >
                                    <div className="space-y-3">
                                        <ToggleRow
                                            title="Attendance warnings"
                                            description="Warn when a subject approaches the target."
                                            enabled={notifications}
                                            onToggle={() => setNotifications(!notifications)}
                                        />

                                        <ToggleRow
                                            title="Auto sync"
                                            description="Refresh academic data when the app opens."
                                            enabled={autoSync}
                                            onToggle={() => setAutoSync(!autoSync)}
                                        />
                                    </div>
                                </SettingBlock>
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
                                        Privacy Design
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                                        Keep auth server-side
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Browser calls only your own API routes. PESU credentials are
                                        not stored in localStorage.
                                    </p>
                                </div>

                                <StudioIconBubble icon={LockKeyhole} tone="blue" />
                            </div>

                            <div className="studio-card-soft mt-6 p-5">
                                <InfoRow label="Frontend" value="No PESU password storage" />
                                <InfoRow label="Backend" value="Route handlers" />
                                <InfoRow label="Session" value="HTTP-only cookie" />
                                <InfoRow
                                    label="Status"
                                    value={session.connected ? "Active" : "Offline"}
                                />
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Account"
                                title="Student Profile"
                                detail={session.connected ? "Connected profile" : "Demo profile"}
                            />

                            <div className="studio-card-soft mt-5 p-5">
                                <div className="flex items-center gap-4">
                                    {profile?.photoDataUrl ? (
                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] shadow-lg shadow-black/30">
                                            <Image
                                                src={profile.photoDataUrl}
                                                alt={profile?.name ?? "Student"}
                                                fill
                                                unoptimized
                                                sizes="56px"
                                                loading="eager"
                                                className="h-full w-full object-cover object-top brightness-[1.03] contrast-[1.06] saturate-[1.08]"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-3 text-slate-300 backdrop-blur-xl">
                                            <User2 size={24} />
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-lg font-black">
                                            {profile?.name ?? session.srn ?? "Student"}
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            {session.connected
                                                ? [
                                                    profile?.srn,
                                                    profile?.semester,
                                                    profile?.section
                                                        ? `Sec ${profile.section}`
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ") ||
                                                "PESUAcademy session connected."
                                                : "PESUAcademy profile will appear after real sync."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3">
                                    <StudioInfoBox
                                        title="Connection"
                                        description={session.connected ? "Connected" : "Not connected"}
                                    />
                                    <StudioInfoBox
                                        title="SRN"
                                        description={
                                            session.connected
                                                ? profile?.srn ?? session.srn ?? "-"
                                                : "Not connected"
                                        }
                                    />
                                    <StudioInfoBox
                                        title="Branch"
                                        description={profile?.branch ?? "Not synced"}
                                    />
                                    <StudioInfoBox
                                        title="Last sync"
                                        description={
                                            session.syncedAt
                                                ? new Date(session.syncedAt).toLocaleString()
                                                : "Not synced"
                                        }
                                    />
                                    <StudioInfoBox
                                        title="Mode"
                                        description={session.connectorMode ?? "none"}
                                    />
                                </div>
                            </div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Data Sources"
                                title="Safe Sync Coverage"
                                detail="Live session status"
                            />

                            <motion.div
                                variants={staggerContainer(0.06)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 grid gap-3"
                            >
                                {dataSources.map((source) => (
                                    <DataSourceStatusCard
                                        key={source.label}
                                        label={source.label}
                                        status={source.status}
                                        detail={source.detail}
                                    />
                                ))}
                            </motion.div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <StudioSectionHeader
                                eyebrow="Controls"
                                title="Data Actions"
                                detail="Session tools"
                            />

                            <motion.div
                                variants={staggerContainer(0.08)}
                                initial="initial"
                                animate="animate"
                                className="mt-5 space-y-3"
                            >
                                <ActionButton
                                    icon={RefreshCw}
                                    label="Refresh PESU Session"
                                    onClick={refreshSession}
                                />
                                <ActionButton
                                    icon={Database}
                                    label="Clear Local Cache"
                                    onClick={clearPesuSyncCache}
                                />
                                <ActionButton
                                    icon={SlidersHorizontal}
                                    label="Reset Local Settings"
                                    onClick={resetSettings}
                                />
                                <ActionButton
                                    icon={KeyRound}
                                    label="Reset Server Session"
                                    onClick={disconnect}
                                />
                            </motion.div>
                        </motion.section>

                        <motion.section
                            variants={sectionMotion}
                            initial="initial"
                            animate="animate"
                            className="studio-card p-5"
                        >
                            <div className="flex items-start gap-4">
                                <StudioIconBubble icon={SlidersHorizontal} tone="violet" />

                                <div>
                                    <h2 className="text-lg font-black tracking-tight">
                                        Current Mode
                                    </h2>

                                    <p className="mt-2 text-sm leading-7 text-slate-400">
                                        Login runs the PESU sync server-side and keeps only safe
                                        normalized academic data in the session.
                                    </p>
                                </div>
                            </div>
                        </motion.section>
                    </aside>
                </section>
            </div>
        </DashboardShell>
    );
}

function SettingsHeroCard({
    isLoading,
    connected,
    srn,
    connectorMode,
}: {
    isLoading: boolean;
    connected: boolean;
    srn: string | null;
    connectorMode: string;
}) {
    return (
        <div className="studio-card-soft p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                PESU Sync
            </p>

            <div className="mt-4 flex items-end gap-3">
                <p className="text-4xl font-black tracking-[-0.05em]">
                    {isLoading ? "Checking" : connected ? "Connected" : "Offline"}
                </p>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
                {connected
                    ? `Connected as ${srn}`
                    : "Connect your PESUAcademy account to sync live academic data."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
                <StudioToneBadge tone={connected ? "green" : "orange"}>
                    {connected ? "Server session active" : "Not connected"}
                </StudioToneBadge>

                <StudioToneBadge tone={connectorMode === "pesu" ? "green" : "orange"}>
                    {connectorMode === "pesu" ? "PESU sync" : "Offline"}
                </StudioToneBadge>
            </div>
        </div>
    );
}

function MetricMotionCard({ children }: { children: ReactNode }) {
    return (
        <motion.div variants={cardMotion} className="smooth-card">
            {children}
        </motion.div>
    );
}

function AttendanceTargetControl({
    value,
    onChange,
}: {
    value: number;
    onChange: (value: number) => void;
}) {
    const sliderProgress = Math.max(0, value - 50) * 2;

    return (
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl">
            <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-sky-300/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#795be6]/20 blur-3xl" />

            <div className="relative z-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                            Live Target
                        </p>

                        <p className="mt-2 text-5xl font-black tracking-[-0.06em] text-white">
                            {value}%
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                        <span>Relaxed 75%</span>
                        <span>Safe 85%</span>
                        <span>Strict 95%</span>
                    </div>
                </div>

                <input
                    aria-label="Attendance target"
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(event) => onChange(Number(event.target.value))}
                    className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-sky-200"
                    style={{
                        background: `linear-gradient(90deg, #bae6fd ${sliderProgress}%, rgba(255,255,255,0.1) ${sliderProgress}%)`,
                    }}
                />

                <div className="mt-4 grid grid-cols-3 gap-2">
                    {targetOptions.map((option) => (
                        <button
                            key={option}
                            onClick={() => onChange(option)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-black transition duration-300 ${value === option
                                ? "border-white bg-white text-slate-950"
                                : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                }`}
                        >
                            {option}%
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DataSourceStatusCard({
    label,
    status,
    detail,
}: {
    label: string;
    status: string;
    detail: string;
}) {
    const live = status === "Live";
    const missing = status === "Missing";

    return (
        <motion.div
            variants={cardMotion}
            className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] px-4 py-3 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055]"
        >
            <div className="min-w-0">
                <p className="font-black text-white">{label}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {detail}
                </p>
            </div>

            <span
                className={`rounded-full px-3 py-1 text-xs font-black ${live
                    ? "bg-emerald-300/10 text-emerald-200"
                    : missing
                        ? "bg-red-300/10 text-red-200"
                        : "bg-orange-300/10 text-orange-200"
                    }`}
            >
                {status}
            </span>
        </motion.div>
    );
}

function SettingBlock({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <motion.div
            variants={cardMotion}
            className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055]"
        >
            <div className="mb-5 flex gap-4">
                <StudioIconBubble icon={Icon} tone="blue" />

                <div>
                    <h3 className="font-black tracking-tight">{title}</h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </motion.div>
    );
}

function ToggleRow({
    title,
    description,
    enabled,
    onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-5 rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-4 text-left backdrop-blur-xl transition duration-300 hover:bg-white/[0.055]"
        >
            <div>
                <p className="font-black">{title}</p>

                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>

            <div
                className={`flex h-7 w-12 shrink-0 items-center rounded-full border p-1 transition duration-300 ${enabled
                    ? "justify-end border-sky-300/20 bg-sky-300/20"
                    : "justify-start border-white/[0.08] bg-white/[0.05]"
                    }`}
            >
                <span
                    className={`h-5 w-5 rounded-full transition duration-300 ${enabled ? "bg-sky-200" : "bg-slate-500"
                        }`}
                />
            </div>
        </button>
    );
}

function ActionButton({
    icon: Icon,
    label,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
}) {
    return (
        <motion.button
            variants={cardMotion}
            onClick={onClick}
            className="flex w-full items-center justify-between rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-slate-300 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055] hover:text-white"
        >
            <span className="flex items-center gap-3">
                <Icon size={17} className="text-slate-500" />
                {label}
            </span>

            <span className="text-slate-600">→</span>
        </motion.button>
    );
}
