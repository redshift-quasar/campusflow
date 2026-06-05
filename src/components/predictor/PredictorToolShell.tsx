"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Database } from "lucide-react";

import {
    PredictorTabs,
    type PredictorTab,
} from "@/components/predictor/PredictorTabs";
import { sectionMotion } from "@/lib/motion";

export function PredictorToolShell({
    activeTab,
    onTabChange,
    children,
}: {
    activeTab: PredictorTab;
    onTabChange: (tab: PredictorTab) => void;
    children: ReactNode;
}) {
    return (
        <motion.section
            variants={sectionMotion}
            initial="initial"
            animate="animate"
            className="studio-card p-4 sm:p-5 lg:p-6"
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <PredictorTabs activeTab={activeTab} onChange={onTabChange} />

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <Database size={14} />
                    Live-first predictor
                </div>
            </div>

            <div className="mt-6">{children}</div>
        </motion.section>
    );
}
