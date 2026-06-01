"use client";

import { motion } from "framer-motion";

export function RouteLoadingBar({ routeKey }: { routeKey: string }) {
    return (
        <motion.div
            key={routeKey}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{
                scaleX: {
                    duration: 0.75,
                    ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                    delay: 0.55,
                    duration: 0.28,
                    ease: "easeOut",
                },
            }}
            className="pointer-events-none fixed left-0 top-0 z-[120] h-[3px] w-full origin-left bg-sky-300 shadow-lg shadow-sky-300/40"
        />
    );
}