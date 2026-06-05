"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

import { StudioCard, StudioIconBubble } from "@/components/studio/Studio";
import { sectionMotion } from "@/lib/motion";

export function SgpaComingSoon() {
    return (
        <motion.section
            variants={sectionMotion}
            initial="initial"
            animate="animate"
        >
            <StudioCard className="p-6">
                <div className="grid gap-6 md:grid-cols-[auto,minmax(0,1fr)] md:items-center">
                    <StudioIconBubble icon={GraduationCap} tone="violet" />

                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">

                            Coming soon
                        </div>

                        <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                            Grade and SGPA planning will be added after Attendance Predictor.
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                            SGPA and CGPA predictor will be added next.
                        </p>
                    </div>
                </div>
            </StudioCard>
        </motion.section>
    );
}
