"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cardMotion } from "@/lib/motion";

type MetricTone =
    | "blue"
    | "green"
    | "orange"
    | "violet"
    | "red"
    | "slate"
    | "sky"
    | "purple"
    | "emerald"
    | "yellow"
    | "pink"
    | "rose";

type MetricCardProps = {
    label?: string;
    title?: string;
    value: string | number;
    detail?: string;
    description?: string;
    icon?: LucideIcon;
    tone?: MetricTone | string;
    href?: string;
    children?: ReactNode;
};

const toneClasses = {
    blue: {
        glow: "bg-sky-300/20",
        icon: "bg-sky-300/10 text-sky-200",
        text: "text-sky-200",
    },
    sky: {
        glow: "bg-sky-300/20",
        icon: "bg-sky-300/10 text-sky-200",
        text: "text-sky-200",
    },
    green: {
        glow: "bg-emerald-300/20",
        icon: "bg-emerald-300/10 text-emerald-200",
        text: "text-emerald-200",
    },
    emerald: {
        glow: "bg-emerald-300/20",
        icon: "bg-emerald-300/10 text-emerald-200",
        text: "text-emerald-200",
    },
    orange: {
        glow: "bg-orange-300/20",
        icon: "bg-orange-300/10 text-orange-200",
        text: "text-orange-200",
    },
    yellow: {
        glow: "bg-yellow-300/20",
        icon: "bg-yellow-300/10 text-yellow-200",
        text: "text-yellow-200",
    },
    violet: {
        glow: "bg-[#795be6]/25",
        icon: "bg-[#795be6]/15 text-[#d7ceff]",
        text: "text-[#d7ceff]",
    },
    purple: {
        glow: "bg-[#795be6]/25",
        icon: "bg-[#795be6]/15 text-[#d7ceff]",
        text: "text-[#d7ceff]",
    },
    pink: {
        glow: "bg-pink-300/20",
        icon: "bg-pink-300/10 text-pink-200",
        text: "text-pink-200",
    },
    rose: {
        glow: "bg-rose-300/20",
        icon: "bg-rose-300/10 text-rose-200",
        text: "text-rose-200",
    },
    red: {
        glow: "bg-red-300/20",
        icon: "bg-red-300/10 text-red-200",
        text: "text-red-200",
    },
    slate: {
        glow: "bg-white/[0.08]",
        icon: "bg-white/[0.055] text-slate-300",
        text: "text-slate-300",
    },
} as const;

function getMetricTone(tone?: string) {
    if (!tone) return toneClasses.blue;

    return toneClasses[tone as keyof typeof toneClasses] ?? toneClasses.blue;
}

export function MetricCard({
    label,
    title,
    value,
    detail,
    description,
    icon,
    tone = "blue",
    href,
    children,
}: MetricCardProps) {
    const Icon = icon;
    const selectedTone = getMetricTone(tone);

    const heading = label ?? title;
    const subtext = detail ?? description;

    const content = (
        <motion.div
            variants={cardMotion}
            className="group relative h-full overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.07]"
        >
            <div
                className={`absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${selectedTone.glow}`}
            />

            <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-gradient-to-br from-white/[0.055] via-transparent to-black/20" />

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        {heading && (
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                {heading}
                            </p>
                        )}

                        <h3 className="mt-5 truncate text-3xl font-black tracking-[-0.05em] text-white">
                            {value}
                        </h3>
                    </div>

                    {Icon && (
                        <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xl ${selectedTone.icon}`}
                        >
                            <Icon size={21} />
                        </div>
                    )}
                </div>

                {subtext && (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        {subtext}
                    </p>
                )}

                {children && <div className="mt-4">{children}</div>}

                {href && (
                    <div className="mt-5 inline-flex items-center gap-2 text-xs font-black text-slate-500 transition group-hover:text-white">
                        Open
                        <ArrowUpRight size={14} />
                    </div>
                )}
            </div>
        </motion.div>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block h-full">
            {content}
        </Link>
    );
}

export default MetricCard;