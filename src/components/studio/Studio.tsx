"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    Info,
} from "lucide-react";

type Tone = "blue" | "green" | "orange" | "violet" | "red" | "slate";
type ProgressTone = "green" | "orange" | "red";

const toneClasses: Record<
    Tone,
    {
        icon: string;
        glow: string;
        badge: string;
        text: string;
    }
> = {
    blue: {
        icon: "bg-sky-300/10 text-sky-200",
        glow: "bg-sky-300/20",
        badge: "bg-sky-300/10 text-sky-200",
        text: "text-sky-200",
    },
    green: {
        icon: "bg-emerald-300/10 text-emerald-200",
        glow: "bg-emerald-300/20",
        badge: "bg-emerald-300/10 text-emerald-200",
        text: "text-emerald-200",
    },
    orange: {
        icon: "bg-orange-300/10 text-orange-200",
        glow: "bg-orange-300/20",
        badge: "bg-orange-300/10 text-orange-200",
        text: "text-orange-200",
    },
    violet: {
        icon: "bg-[#795be6]/15 text-[#d7ceff]",
        glow: "bg-[#795be6]/25",
        badge: "bg-[#795be6]/15 text-[#d7ceff]",
        text: "text-[#d7ceff]",
    },
    red: {
        icon: "bg-red-300/10 text-red-200",
        glow: "bg-red-300/20",
        badge: "bg-red-300/10 text-red-200",
        text: "text-red-200",
    },
    slate: {
        icon: "bg-white/[0.055] text-slate-300",
        glow: "bg-white/[0.08]",
        badge: "bg-white/[0.055] text-slate-300",
        text: "text-slate-300",
    },
};

export function StudioHero({
    badge,
    title,
    mutedTitle,
    description,
    children,
}: {
    badge: string;
    title: string;
    mutedTitle?: string;
    description: string;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.07] bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7 lg:p-8">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#795be6]/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/20" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                <div>
                    <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.055] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#d7ceff] backdrop-blur-xl">
                        {badge}
                    </div>

                    <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.075em] text-white sm:text-6xl lg:text-7xl">
                        {title}
                        {mutedTitle && (
                            <span className="block text-slate-500">{mutedTitle}</span>
                        )}
                    </h1>

                    <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
                        {description}
                    </p>
                </div>

                {children && <div className="relative z-10">{children}</div>}
            </div>
        </section>
    );
}

export function StudioSectionHeader({
    eyebrow,
    title,
    detail,
    href,
    action = "Open",
}: {
    eyebrow?: string;
    title: string;
    detail?: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                {eyebrow && (
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        {eyebrow}
                    </p>
                )}

                <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                    {title}
                </h2>

                {detail && (
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        {detail}
                    </p>
                )}
            </div>

            {href && (
                <Link
                    href={href}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-[#ded7ff]"
                >
                    {action}
                    <ArrowUpRight size={14} />
                </Link>
            )}
        </div>
    );
}

export function StudioIconBubble({
    icon,
    tone = "blue",
}: {
    icon: LucideIcon;
    tone?: Tone;
}) {
    const Icon = icon;
    const selectedTone = toneClasses[tone];

    return (
        <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xl ${selectedTone.icon}`}
        >
            <div
                className={`absolute inset-0 rounded-2xl blur-xl ${selectedTone.glow}`}
            />
            <Icon size={21} className="relative z-10" />
        </div>
    );
}

export function StudioMini({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string | number;
    wide?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border border-white/[0.06] bg-white/[0.035] px-4 py-3 backdrop-blur-xl ${wide ? "col-span-2" : ""
                }`}
        >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                {label}
            </p>

            <p className="mt-1 truncate text-sm font-black text-slate-300">{value}</p>
        </div>
    );
}

export function StudioProgressBar({
    value,
    tone = "green",
}: {
    value: number;
    tone?: ProgressTone;
}) {
    const safeValue = Math.max(0, Math.min(100, value));

    const progressClasses = {
        green: "bg-emerald-300 shadow-emerald-300/30",
        orange: "bg-orange-300 shadow-orange-300/30",
        red: "bg-red-300 shadow-red-300/30",
    };

    return (
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.075]">
            <div
                className={`h-full rounded-full shadow-lg transition-all duration-700 ${progressClasses[tone]}`}
                style={{ width: `${safeValue}%` }}
            />
        </div>
    );
}

export function StudioToneBadge({
    children,
    tone = "green",
}: {
    children: ReactNode;
    tone?: Tone;
}) {
    return (
        <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${toneClasses[tone].badge}`}
        >
            {children}
        </span>
    );
}

export function StudioStatusBadge({
    status,
}: {
    status: "completed" | "ongoing" | "upcoming" | string;
}) {
    const config =
        status === "completed"
            ? {
                label: "Completed",
                icon: CheckCircle2,
                className: "bg-emerald-300/10 text-emerald-200",
            }
            : status === "ongoing"
                ? {
                    label: "Ongoing",
                    icon: Clock3,
                    className: "bg-sky-300/10 text-sky-200",
                }
                : {
                    label: "Upcoming",
                    icon: AlertCircle,
                    className: "bg-orange-300/10 text-orange-200",
                };

    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${config.className}`}
        >
            <Icon size={12} />
            {config.label}
        </span>
    );
}

export function StudioActionLink({
    href,
    icon,
    label,
    detail,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    detail?: string;
}) {
    const Icon = icon;

    return (
        <Link
            href={href}
            className="group relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.11] hover:bg-white/[0.065]"
        >
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#795be6]/15 opacity-0 blur-2xl transition group-hover:opacity-100" />

            <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-[#d7ceff]">
                        <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-300">
                            {label}
                        </p>

                        {detail && (
                            <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                                {detail}
                            </p>
                        )}
                    </div>
                </div>

                <ArrowUpRight
                    size={16}
                    className="shrink-0 text-slate-600 transition group-hover:text-white"
                />
            </div>
        </Link>
    );
}

export function StudioInfoBox({
    title,
    description,
    tone = "blue",
    icon = Info,
}: {
    title: string;
    description: string;
    tone?: Tone;
    icon?: LucideIcon;
}) {
    const selectedTone = toneClasses[tone];
    const Icon = icon;

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-2xl">
            <div
                className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${selectedTone.glow}`}
            />

            <div className="relative z-10 flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${selectedTone.icon}`}
                >
                    <Icon size={18} />
                </div>

                <div>
                    <h3 className="font-black tracking-tight text-white">{title}</h3>

                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function StudioCard({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur-2xl ${className}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.055] via-transparent to-black/20" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
