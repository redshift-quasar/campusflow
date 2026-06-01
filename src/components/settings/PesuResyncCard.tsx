"use client";

import { Loader2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

type PesuResyncCardProps = {
    connected: boolean;
    srn: string | null;
    connectorMode: string;
    isLoading: boolean;
    isSubmitting: boolean;
    error?: string;
    onRefresh: () => void | Promise<void>;
    onDisconnect: () => void | Promise<void>;
};

export function PesuResyncCard({
    connected,
    srn,
    connectorMode,
    isLoading,
    isSubmitting,
    error,
    onRefresh,
    onDisconnect,
}: PesuResyncCardProps) {
    const busy = isLoading || isSubmitting;

    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#795be6]/25 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-sky-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/20" />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">
                            PESU Academy
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                            Server Session
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Refresh or disconnect the HTTP-only PESU session. Passwords are
                            only sent during connect and are never stored in browser storage.
                        </p>
                    </div>

                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${connected
                            ? "bg-emerald-300/10 text-emerald-200"
                            : "bg-orange-300/10 text-orange-200"
                            }`}
                    >
                        <ShieldCheck size={22} />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
                        {error}
                    </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                        onClick={() => void onRefresh()}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? (
                            <Loader2 size={17} className="animate-spin" />
                        ) : (
                            <RefreshCw size={17} />
                        )}
                        Refresh Server Session
                    </button>

                    <button
                        onClick={() => void onDisconnect()}
                        disabled={busy || !connected}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-300/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <LogOut size={17} />
                        Disconnect Session
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <MiniInfo label="Status" value={connected ? "Connected" : "Offline"} />
                    <MiniInfo label="SRN" value={srn ?? "Not connected"} />
                    <MiniInfo label="Connector" value={connectorMode || "mock"} />
                    <MiniInfo label="Storage" value="HTTP-only cookie" />
                </div>
            </div>
        </section>
    );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>

            <p className="mt-1 truncate text-sm font-black text-slate-300">
                {value}
            </p>
        </div>
    );
}
