"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { AttendancePredictor } from "@/components/predictor/AttendancePredictor";
import { PredictorToolShell } from "@/components/predictor/PredictorToolShell";
import type { PredictorTab } from "@/components/predictor/PredictorTabs";
import { SgpaComingSoon } from "@/components/predictor/SgpaComingSoon";
import {
    StudioHero,
    StudioIconBubble,
    StudioMini,
    StudioProgressBar,
} from "@/components/studio/Studio";
import { sectionMotion } from "@/lib/motion";

export default function PredictorPage() {
    const [activeTab, setActiveTab] = useState<PredictorTab>("attendance");

    return (
        <DashboardShell
            title="Predictor"
            subtitle="Plan attendance and academic outcomes before they surprise you."
        >
            <div className="main-shine-surface mx-auto max-w-7xl space-y-6 rounded-[2.5rem]">
                <motion.div variants={sectionMotion} initial="initial" animate="animate">
                    <StudioHero
                        badge="CampusFlow / Predictor"
                        title="Predictor"
                        mutedTitle="Tool."
                        description="Plan attendance and academic outcomes before they surprise you."
                    >
                        <PredictorHeroCard />
                    </StudioHero>
                </motion.div>

                <PredictorToolShell
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                >
                    {activeTab === "attendance" ? (
                        <AttendancePredictor />
                    ) : (
                        <SgpaComingSoon />
                    )}
                </PredictorToolShell>
            </div>
        </DashboardShell>
    );
}

function PredictorHeroCard() {
    return (
        <div className="studio-card-soft p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Live Predictor
                    </p>

                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-5xl font-black tracking-[-0.06em]">
                            PESU
                        </p>
                        <p className="mb-2 text-sm font-semibold text-slate-500">
                            synced
                        </p>
                    </div>
                </div>

                <StudioIconBubble icon={Calculator} tone="violet" />
            </div>

            <div className="mt-5">
                <StudioProgressBar value={75} tone="green" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <StudioMini label="Primary data" value="PESU Live" />
                <StudioMini label="Manual" value="Fallback" />
                <StudioMini label="Tool" value="Attendance" />
                <StudioMini label="Next" value="SGPA / CGPA" />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035] p-3">
                <div className="mt-0.5 rounded-xl bg-emerald-300/10 p-2 text-emerald-200">
                    <TrendingUp size={15} />
                </div>

                <div>
                    <p className="text-sm font-black text-white">
                        Live attendance first
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Simulations stay local and never mutate synced PESU data.
                    </p>
                </div>
            </div>
        </div>
    );
}
