"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cardMotion, sectionMotion, staggerContainer } from "@/lib/motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InfoRow } from "@/components/dashboard/InfoRow";
import { PesuResyncCard } from "@/components/settings/PesuResyncCard";
import { useSettingsStore } from "@/lib/store/settings-store";
import { usePesuSession } from "@/lib/hooks/use-pesu-session";
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
    KeyRound,
    Link2,
    LockKeyhole,
    RefreshCw,
    ShieldCheck,
    SlidersHorizontal,
    Target,
    User2,
} from "lucide-react";

const targetOptions = [75, 80, 85, 90];

export default function SettingsPage() {
    const target = useSettingsStore((state) => state.attendanceTarget);
    const setTarget = useSettingsStore((state) => state.setAttendanceTarget);

    const notifications = useSettingsStore((state) => state.notifications);
    const setNotifications = useSettingsStore((state) => state.setNotifications);

    const autoSync = useSettingsStore((state) => state.autoSync);
    const setAutoSync = useSettingsStore((state) => state.setAutoSync);

    const {
        session,
        isLoading,
        isSubmitting,
        error,
        connect,
        disconnect,
        refreshSession,
    } = usePesuSession();

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
                            label="Interface"
                            value="Fixed"
                            detail="Constant studio UI"
                            icon={SlidersHorizontal}
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

                            <div className="mt-5 rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex gap-4">
                                        <StudioIconBubble
                                            icon={session.connected ? ShieldCheck : LockKeyhole}
                                            tone={session.connected ? "green" : "orange"}
                                        />

                                        <div>
                                            <h3 className="font-black tracking-tight">
                                                {session.connected
                                                    ? "PESUAcademy connected"
                                                    : "Connect PESUAcademy"}
                                            </h3>

                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                {session.connected
                                                    ? "Your PESUAcademy session is active on the server."
                                                    : "Enter SRN and password. The password is sent only to /api/pesu/login and is not saved in browser storage."}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={refreshSession}
                                        disabled={isSubmitting}
                                        className="studio-button w-fit disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Refresh Status
                                    </button>
                                </div>

                                {error && (
                                    <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
                                        {error}
                                    </div>
                                )}

                                {session.connected ? (
                                    <div className="mt-6">
                                        <PesuResyncCard
                                            connected={session.connected}
                                            srn={session.srn}
                                            connectorMode={session.connectorMode}
                                            isLoading={isLoading}
                                            isSubmitting={isSubmitting}
                                            onRefresh={refreshSession}
                                            onDisconnect={disconnect}
                                        />
                                    </div>
                                ) : (
                                    <form onSubmit={handleConnect} className="mt-6 space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
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

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !srn.trim() || !password.trim()}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition duration-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Link2 size={16} />
                                            {isSubmitting ? "Connecting..." : "Connect PESUAcademy"}
                                        </button>

                                        <p className="text-xs leading-5 text-slate-500">
                                            The connector can run in mock or real mode, but the
                                            browser only talks to your server API routes.
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
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 gap-2">
                                            {targetOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    onClick={() => setTarget(option)}
                                                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition duration-300 ${target === option
                                                        ? "border-white bg-white text-slate-950"
                                                        : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                                                        }`}
                                                >
                                                    {option}%
                                                </button>
                                            ))}
                                        </div>

                                        <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
                                            <label
                                                htmlFor="customTarget"
                                                className="mb-2 block text-sm font-bold text-slate-300"
                                            >
                                                Custom attendance target
                                            </label>

                                            <div className="flex items-center gap-3">
                                                <input
                                                    id="customTarget"
                                                    type="number"
                                                    min={1}
                                                    max={99}
                                                    value={target}
                                                    onChange={(event) => {
                                                        const value = Number(event.target.value);
                                                        setTarget(Math.min(99, Math.max(1, value)));
                                                    }}
                                                    className="studio-input w-full"
                                                />

                                                <span className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-black text-slate-300 backdrop-blur-xl">
                                                    %
                                                </span>
                                            </div>

                                            <p className="mt-3 text-xs leading-5 text-slate-500">
                                                Recommended range: 75% to 90%. This value controls
                                                warnings across the app.
                                            </p>
                                        </div>
                                    </div>
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
                                        Browser calls only your own API routes. PESU session lives
                                        in HTTP-only cookies.
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
                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-3 text-slate-300 backdrop-blur-xl">
                                        <User2 size={24} />
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black">
                                            {session.connected ? session.srn : "No server session"}
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            {session.connected
                                                ? "PESUAcademy session connected."
                                                : "Connect PESUAcademy to start a server session."}
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
                                        description={session.connected ? session.srn ?? "-" : "Not connected"}
                                    />
                                    <StudioInfoBox
                                        title="Mode"
                                        description={session.connectorMode ?? "mock"}
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
                                eyebrow="Controls"
                                title="Server Actions"
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
                                    label="Refresh Server Session"
                                    onClick={refreshSession}
                                    disabled={isSubmitting}
                                />
                                <ActionButton
                                    icon={KeyRound}
                                    label="Disconnect Server Session"
                                    onClick={disconnect}
                                    disabled={isSubmitting || !session.connected}
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
                                        PESUAcademy is using the {session.connectorMode || "mock"} connector.
                                        Sessions stay on the server behind HTTP-only cookies.
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
                    : "Connect your PESUAcademy account to sync real attendance later."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
                <StudioToneBadge tone={connected ? "green" : "orange"}>
                    {connected ? "Server session active" : "Not connected"}
                </StudioToneBadge>

                <StudioToneBadge tone={connectorMode === "real" ? "green" : "orange"}>
                    {connectorMode === "real" ? "Real connector" : "Mock connector"}
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
    disabled = false,
}: {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <motion.button
            variants={cardMotion}
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center justify-between rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-left text-sm font-bold text-slate-300 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-0.5 hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
            <span className="flex items-center gap-3">
                <Icon size={17} className="text-slate-500" />
                {label}
            </span>

            <span className="text-slate-600">→</span>
        </motion.button>
    );
}
