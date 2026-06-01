"use client";

import { GraduationCap, IdCard, Layers3, UserRound } from "lucide-react";
import { useLocalAuth } from "@/lib/hooks/use-local-auth";
import { usePesuProfile } from "@/lib/hooks/use-pesu-profile";

export function PesuProfilePanel() {
    const { user } = useLocalAuth();
    const { profile, courses, source, syncedAt } = usePesuProfile();

    const displayName = profile?.name ?? user?.name ?? user?.srn ?? "Student";
    const srn = profile?.srn ?? user?.srn ?? "Not logged in";

    return (
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#795be6]/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/20" />

            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-white/10">
                        <UserRound size={22} />
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                            {displayName}
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {srn}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-2">
                    <ProfileMiniRow
                        icon={GraduationCap}
                        label="Semester"
                        value={
                            profile?.semester && profile?.section
                                ? `${profile.semester} • ${profile.section}`
                                : profile?.semester ?? "Not synced"
                        }
                    />

                    <ProfileMiniRow
                        icon={Layers3}
                        label="Branch"
                        value={profile?.branch ?? "Sync PESU profile"}
                    />

                    <ProfileMiniRow
                        icon={IdCard}
                        label="Courses"
                        value={
                            source === "pesu"
                                ? `${courses.length} enrolled`
                                : "Demo / local preview"
                        }
                    />
                </div>

                <div className="mt-4 rounded-2xl bg-white/[0.04] px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                        PESU Sync
                    </p>

                    <p className="mt-1 truncate text-xs font-bold text-slate-400">
                        {syncedAt
                            ? new Date(syncedAt).toLocaleString()
                            : "Login once to sync safely"}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ProfileMiniRow({
    icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    const Icon = icon;

    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#795be6]/15 text-[#d7ceff]">
                <Icon size={15} />
            </div>

            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                    {label}
                </p>

                <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
                    {value}
                </p>
            </div>
        </div>
    );
}