"use client";

import { BarChart3, GraduationCap } from "lucide-react";

export type PredictorTab = "attendance" | "sgpa";

export function PredictorTabs({
    activeTab,
    onChange,
}: {
    activeTab: PredictorTab;
    onChange: (tab: PredictorTab) => void;
}) {
    const tabs = [
        {
            id: "attendance" as const,
            label: "Attendance Predictor",
            icon: BarChart3,
            comingSoon: false,
        },
        {
            id: "sgpa" as const,
            label: "SGPA / CGPA Predictor",
            icon: GraduationCap,
            comingSoon: true,
        },
    ];

    return (
        <div
            role="tablist"
            className="flex w-full flex-wrap rounded-[1.4rem] border border-white/[0.07] bg-white/[0.035] p-1.5 backdrop-blur-2xl sm:inline-flex sm:w-auto"
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.id)}
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[1.1rem] px-4 py-2.5 text-sm font-black transition sm:flex-none ${active
                            ? "bg-white text-slate-950 shadow-lg shadow-white/10"
                            : "text-slate-400 hover:bg-white/[0.055] hover:text-white"
                            }`}
                    >
                        <Icon size={16} />
                        {tab.label}
                        {tab.comingSoon && (
                            <span className="rounded-full bg-orange-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-orange-100">
                                Soon
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
