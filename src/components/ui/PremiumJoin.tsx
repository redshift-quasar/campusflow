"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { joinContainerMotion, joinItemMotion } from "@/lib/motion";

type PremiumJoinSurfaceProps = {
    children: ReactNode;
    className?: string;
};

type PremiumJoinItemProps = {
    children: ReactNode;
    className?: string;
};

export function PremiumJoinSurface({
    children,
    className = "",
}: PremiumJoinSurfaceProps) {
    return (
        <motion.div
            variants={joinContainerMotion}
            initial="initial"
            animate="animate"
            className={`relative ${className}`}
        >
            {children}
        </motion.div>
    );
}

export function PremiumJoinItem({
    children,
    className = "",
}: PremiumJoinItemProps) {
    return (
        <motion.div variants={joinItemMotion} className={className}>
            {children}
        </motion.div>
    );
}

export function PremiumJoinCard({
    children,
    className = "",
}: PremiumJoinItemProps) {
    return (
        <motion.div
            variants={joinItemMotion}
            className={`group relative overflow-hidden rounded-[1.7rem] border border-white/[0.07] bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.07] ${className}`}
        >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#795be6]/20 blur-3xl transition duration-500 group-hover:scale-125" />
            <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-gradient-to-br from-white/[0.055] via-transparent to-black/20" />

            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

export function PremiumJoinGrid({
    children,
    className = "",
}: PremiumJoinSurfaceProps) {
    return (
        <motion.div
            variants={joinContainerMotion}
            initial="initial"
            animate="animate"
            className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${className}`}
        >
            {children}
        </motion.div>
    );
}