"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type InfoTone =
    | "blue"
    | "green"
    | "orange"
    | "violet"
    | "red"
    | "slate"
    | "sky"
    | "purple"
    | "emerald";

type InfoRowProps = {
    label?: string;
    title?: string;
    value?: string | number;
    detail?: string;
    description?: string;
    icon?: LucideIcon;
    tone?: InfoTone | string;
    rightSlot?: ReactNode;
    children?: ReactNode;
};

const toneClasses = {
    blue: {
        glow: "bg-sky-300/20",
        icon: "bg-sky-300/10 text-sky-200",
        chip: "bg-sky-300/10 text-sky-200",
    },
    sky: {
        glow: "bg-sky-300/20",
        icon: "bg-sky-300/10 text-sky-200",
        chip: "bg-sky-300/10 text-sky-200",
    },
    green: {
        glow: "bg-emerald-300/20",
        icon: "bg-emerald-300/10 text-emerald-200",
        chip: "bg-emerald-300/10 text-emerald-200",
    },
    emerald: {
        glow: "bg-emerald-300/20",
        icon: "bg-emerald-300/10 text-emerald-200",
        chip: "bg-emerald-300/10 text-emerald-200",
    },
    orange: {
        glow: "bg-orange-300/20",
        icon: "bg-orange-300/10 text-orange-200",
        chip: "bg-orange-300/10 text-orange-200",
    },
    violet: {
        glow: "bg-[#795be6]/25",
        icon: "bg-[#795be6]/15 text-[#d7ceff]",
        chip: "bg-[#795be6]/15 text-[#d7ceff]",
    },
    purple: {
        glow: "bg-[#795be6]/25",
        icon: "bg-[#795be6]/15 text-[#d7ceff]",
        chip: "bg-[#795be6]/15 text-[#d7ceff]",
    },
    red: {
        glow: "bg-red-300/20",
        icon: "bg-red-300/10 text-red-200",
        chip: "bg-red-300/10 text-red-200",
    },
    slate: {
        glow: "bg-white/[0.08]",
        icon: "bg-white/[0.055] text-slate-300",
        chip: "bg-white/[0.055] text-slate-300",
    },
} as const;

function getInfoTone(tone?: string) {
    if (!tone) return toneClasses.violet;

    return toneClasses[tone as keyof typeof toneClasses] ?? toneClasses.violet;
}

export function InfoRow({
    label,
    title,
    value,
    detail,
    description,
    icon,
    tone = "violet",
    rightSlot,
    children,
}: InfoRowProps) {
    const Icon = icon;
    const selectedTone = getInfoTone(tone);

    const heading = label ?? title;
    const subtext = detail ?? description;

    return (
        <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:bg-white/[0.06]">
            <div
                className={`absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${selectedTone.glow}`}
            />

            <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-gradient-to-br from-white/[0.045] via-transparent to-black/20" />

            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    {Icon && (
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${selectedTone.icon}`}
                        >
                            <Icon size={18} />
                        </div>
                    )}

                    <div className="min-w-0">
                        {heading && (
                            <p className="truncate text-sm font-black tracking-tight text-white">
                                {heading}
                            </p>
                        )}

                        {subtext && (
                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {subtext}
                            </p>
                        )}

                        {children && <div className="mt-2">{children}</div>}
                    </div>
                </div>

                {rightSlot ? (
                    <div className="shrink-0">{rightSlot}</div>
                ) : value !== undefined ? (
                    <div
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${selectedTone.chip}`}
                    >
                        {value}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default InfoRow;