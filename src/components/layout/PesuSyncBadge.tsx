"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CloudOff, Loader2, RefreshCw, Wifi } from "lucide-react";
import { usePesuAttendance } from "@/lib/hooks/use-pesu-attendance";

export function PesuSyncBadge() {
    const { loadState, syncedAt, source, syncAttendance, usingDemoData } =
        usePesuAttendance();

    const syncing = loadState === "loading";
    const failed = loadState === "error";
    const connected = loadState === "ready" && source === "pesu";

    const label = syncing
        ? "Syncing"
        : connected
            ? "Connected"
            : usingDemoData
                ? "Demo Data"
                : "Cached Data";

    const eyebrow = connected
            ? "PESU Sync"
            : failed
                ? "Sync Issue"
                : usingDemoData
                    ? "Demo Preview"
                    : "Cached Data";

    const toneClass = connected
        ? "bg-emerald-300/10 text-emerald-200"
        : failed
            ? "bg-orange-300/10 text-orange-200"
            : usingDemoData
                ? "bg-[#795be6]/15 text-[#d7ceff]"
                : "bg-sky-300/10 text-sky-200";

    return (
        <button
            onClick={syncAttendance}
            title="Refresh server attendance"
            className="group relative overflow-hidden rounded-[1.35rem] border border-white/[0.09] bg-white/[0.045] px-4 py-3 text-left shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.075]"
        >
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-sky-300/15 blur-2xl transition duration-300 group-hover:scale-125 group-hover:bg-[#795be6]/25" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.055] via-transparent to-black/20" />

            <div className="relative z-10 flex items-center gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
                >
                    {syncing ? (
                        <Loader2 size={17} className="animate-spin" />
                    ) : connected ? (
                        <CheckCircle2 size={17} />
                    ) : usingDemoData ? (
                        <CloudOff size={17} />
                    ) : (
                        <Wifi size={17} />
                    )}
                </div>

                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        {eyebrow}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs font-black text-slate-300">{label}</p>

                        <motion.span
                            animate={{ rotate: syncing ? 360 : 0 }}
                            transition={{
                                duration: 1,
                                repeat: syncing ? Infinity : 0,
                                ease: "linear",
                            }}
                            className="text-slate-600 transition group-hover:text-slate-300"
                        >
                            <RefreshCw size={12} />
                        </motion.span>
                    </div>
                </div>

                <div className="ml-1 hidden h-8 w-px bg-white/[0.08] xl:block" />

                <div className="hidden min-w-0 xl:block">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        Source
                    </p>

                    <p className="mt-1 max-w-[120px] truncate text-xs font-bold text-slate-500">
                        {syncedAt
                            ? new Date(syncedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : usingDemoData
                                ? "Fallback"
                                : "Cached"}
                    </p>
                </div>
            </div>
        </button>
    );
}
