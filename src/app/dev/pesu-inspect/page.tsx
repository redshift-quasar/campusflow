"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Eye,
    KeyRound,
    LockKeyhole,
    RefreshCw,
    Search,
} from "lucide-react";

type InspectMode = "login" | "attendance" | "calendar";

type InspectorResult = {
    ok: boolean;
    mode?: InspectMode;
    endpointConfigured?: boolean;
    bodyType?: string;
    bodySize?: number;
    topLevelKeys?: string[];
    message?: string;
};

export default function PesuInspectPage() {
    const [mode, setMode] = useState<InspectMode>("login");
    const [srn, setSrn] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState("");
    const [result, setResult] = useState<InspectorResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleInspect(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setIsLoading(true);
            setResult(null);

            const response = await fetch("/api/dev/pesu-inspect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mode,
                    srn,
                    password,
                    token,
                }),
            });

            const data = (await response.json()) as InspectorResult;

            setResult(data);
        } catch {
            setResult({
                ok: false,
                message: "Could not run inspector.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#050814] px-6 py-8 text-white">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="studio-card p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="studio-pill mb-5 inline-flex items-center gap-3 px-4 py-2">
                                <span className="h-2 w-2 rounded-full bg-orange-300" />
                                <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                                    Dev Only
                                </span>
                            </div>

                            <h1 className="text-4xl font-black tracking-tight">
                                PESU Response Inspector
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                                Test PESU endpoint response shapes safely. Sensitive fields like
                                tokens, sessions, passwords, cookies, and auth keys are redacted.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4 text-orange-100">
                            <div className="flex gap-3">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" />

                                <p className="text-sm leading-6">
                                    This page should only be used locally. The API route is
                                    disabled in production.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
                    <motion.form
                        onSubmit={handleInspect}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="studio-card p-5"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-400">
                                    Inspector
                                </p>

                                <h2 className="mt-2 text-2xl font-black tracking-tight">
                                    Request Mode
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-2.5 text-sky-200">
                                <Search size={18} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <ModeButton
                                label="Login"
                                active={mode === "login"}
                                onClick={() => setMode("login")}
                            />
                            <ModeButton
                                label="Attendance"
                                active={mode === "attendance"}
                                onClick={() => setMode("attendance")}
                            />
                            <ModeButton
                                label="Calendar"
                                active={mode === "calendar"}
                                onClick={() => setMode("calendar")}
                            />
                        </div>

                        {mode === "login" ? (
                            <div className="mt-5 space-y-4">
                                <Field
                                    label="SRN / Username"
                                    value={srn}
                                    onChange={setSrn}
                                    placeholder="PES2UG24CS000"
                                    icon="user"
                                />

                                <Field
                                    label="Password"
                                    value={password}
                                    onChange={setPassword}
                                    placeholder="PESUAcademy password"
                                    type="password"
                                    icon="lock"
                                />
                            </div>
                        ) : (
                            <div className="mt-5">
                                <Field
                                    label="Token"
                                    value={token}
                                    onChange={setToken}
                                    placeholder="Paste token/session from login response"
                                    type="password"
                                    icon="key"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Inspecting...
                                </>
                            ) : (
                                <>
                                    <Eye size={16} />
                                    Run Inspector
                                </>
                            )}
                        </button>

                        <p className="mt-4 text-xs leading-5 text-slate-500">
                            Endpoints are read from <code>.env.local</code>:{" "}
                            <code>PESU_LOGIN_ENDPOINT</code>,{" "}
                            <code>PESU_ATTENDANCE_ENDPOINT</code>, and{" "}
                            <code>PESU_CALENDAR_ENDPOINT</code>.
                        </p>
                    </motion.form>

                    <motion.section
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="studio-card p-5"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-400">Result</p>

                                <h2 className="mt-2 text-2xl font-black tracking-tight">
                                    Redacted Preview
                                </h2>
                            </div>

                            <StatusPill result={result} />
                        </div>

                        {!result ? (
                            <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-8 text-center backdrop-blur-xl">
                                <p className="font-black text-slate-300">
                                    No inspection result yet
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Run login, attendance, or calendar inspection to see the
                                    response shape.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <InfoBox label="OK" value={String(result.ok)} />
                                    <InfoBox
                                        label="Body"
                                        value={result.bodyType ?? "-"}
                                    />
                                    <InfoBox label="Mode" value={result.mode ?? "-"} />
                                </div>

                                {result.message && (
                                    <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm font-bold text-red-100">
                                        {result.message}
                                    </div>
                                )}

                                {result.topLevelKeys && result.topLevelKeys.length > 0 && (
                                    <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
                                        <p className="text-sm font-black">Top-level keys</p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {result.topLevelKeys.map((key) => (
                                                <span
                                                    key={key}
                                                    className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-200"
                                                >
                                                    {key}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-[1.5rem] border border-white/[0.07] bg-black/30 p-4 text-xs font-bold text-slate-400">
                                    Response body hidden
                                    {typeof result.bodySize === "number"
                                        ? ` (${result.bodySize} bytes)`
                                        : ""}
                                </div>
                            </div>
                        )}
                    </motion.section>
                </section>
            </div>
        </main>
    );
}

function ModeButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${active
                    ? "border-white bg-white text-slate-950"
                    : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                }`}
        >
            {label}
        </button>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    icon,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    icon: "user" | "lock" | "key";
}) {
    const Icon =
        icon === "lock" ? LockKeyhole : icon === "key" ? KeyRound : KeyRound;

    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
                {label}
            </label>

            <div className="relative">
                <Icon
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    type={type}
                    className="studio-input w-full pl-11"
                />
            </div>
        </div>
    );
}

function StatusPill({ result }: { result: InspectorResult | null }) {
    if (!result) {
        return (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-400">
                Idle
            </span>
        );
    }

    return (
        <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${result.ok
                    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                    : "border-red-300/20 bg-red-300/10 text-red-200"
                }`}
        >
            {result.ok ? "Success" : "Failed"}
        </span>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>

            <p className="mt-2 text-sm font-black text-slate-200">{value}</p>
        </div>
    );
}
