"use client";

import { motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import { cardMotion, staggerContainer } from "@/lib/motion";

export function SubjectSkeletonCard() {
    return (
        <motion.div
            variants={cardMotion}
            className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl"
        >
            <SkeletonShine />

            <div className="relative z-10">
                <div className="flex min-h-20 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <SkeletonLine className="h-3 w-20" />
                        <SkeletonLine className="mt-4 h-5 w-40" />
                        <SkeletonLine className="mt-3 h-3 w-28" />
                    </div>

                    <SkeletonLine className="h-7 w-14 rounded-full" />
                </div>

                <SkeletonLine className="mt-5 h-2 w-full rounded-full" />

                <div className="mt-4 flex items-center justify-between gap-3">
                    <SkeletonLine className="h-3 w-24" />
                    <SkeletonLine className="h-3 w-20" />
                </div>
            </div>
        </motion.div>
    );
}

export function MetricSkeletonCard() {
    return (
        <motion.div
            variants={cardMotion}
            className="relative overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl"
        >
            <SkeletonShine />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <SkeletonLine className="h-3 w-28" />
                        <SkeletonLine className="mt-5 h-8 w-24" />
                    </div>

                    <SkeletonLine className="h-12 w-12 rounded-2xl" />
                </div>

                <SkeletonLine className="mt-4 h-4 w-36" />
            </div>
        </motion.div>
    );
}

export function RowSkeletonCard() {
    return (
        <motion.div
            variants={cardMotion}
            className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl"
        >
            <SkeletonShine />

            <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <SkeletonLine className="h-3 w-20" />
                        <SkeletonLine className="h-6 w-20 rounded-full" />
                    </div>

                    <SkeletonLine className="mt-4 h-5 w-48" />
                    <SkeletonLine className="mt-3 h-3 w-36" />
                </div>

                <SkeletonLine className="h-11 w-28 rounded-2xl" />
            </div>
        </motion.div>
    );
}

export function SyncLoadingPanel({
    title = "Syncing data",
    description = "Fetching your latest academic information.",
}: {
    title?: string;
    description?: string;
}) {
    return (
        <motion.div
            variants={cardMotion}
            initial="initial"
            animate="animate"
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl"
        >
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#795be6]/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-sky-300/10 blur-3xl" />

            <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.055] text-[#d7ceff]">
                <Loader2 className="animate-spin" size={24} />
            </div>

            <h2 className="relative z-10 mt-5 text-xl font-black tracking-tight text-white">
                {title}
            </h2>

            <p className="relative z-10 mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>
        </motion.div>
    );
}

export function PageLoadingState({
    label = "Loading workspace",
}: {
    label?: string;
}) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.04] px-6 py-5 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl">
                <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#795be6]/20 blur-3xl" />

                <div className="relative z-10 mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.055] text-[#d7ceff]">
                    <RefreshCw size={18} className="animate-spin" />
                </div>

                <p className="relative z-10 text-sm font-black text-slate-300">
                    {label}
                </p>
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
    return (
        <motion.div
            variants={staggerContainer(0.08)}
            initial="initial"
            animate="animate"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
            {Array.from({ length: count }).map((_, index) => (
                <MetricSkeletonCard key={index} />
            ))}
        </motion.div>
    );
}

function SkeletonLine({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-full bg-white/[0.075] ${className}`}
        />
    );
}

function SkeletonShine() {
    return (
        <>
            <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.045] via-transparent to-black/20" />
        </>
    );
}