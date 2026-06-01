import type { Variants } from "framer-motion";

export const premiumEase = [0.16, 1, 0.3, 1] as const;
export const softEase = [0.22, 1, 0.36, 1] as const;

export const pageMotion: Variants = {
    initial: {
        opacity: 0,
        y: 18,
        filter: "blur(10px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 0.55,
            ease: premiumEase,
        },
    },
};

export const sectionMotion: Variants = {
    initial: {
        opacity: 0,
        y: 22,
        scale: 0.985,
        filter: "blur(10px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.58,
            ease: premiumEase,
        },
    },
};

export const cardMotion: Variants = {
    initial: {
        opacity: 0,
        y: 18,
        scale: 0.965,
        filter: "blur(8px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.52,
            ease: premiumEase,
        },
    },
};

export const popMotion: Variants = {
    initial: {
        opacity: 0,
        y: 16,
        scale: 0.92,
        filter: "blur(8px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 24,
            mass: 0.8,
        },
    },
};

/**
 * Used by PremiumJoin.tsx.
 * This gives that premium "everything joins together" page-load feel.
 */
export const joinContainerMotion: Variants = {
    initial: {},
    animate: {
        transition: {
            delayChildren: 0.08,
            staggerChildren: 0.075,
        },
    },
};

export const joinItemMotion: Variants = {
    initial: {
        opacity: 0,
        y: 24,
        scale: 0.94,
        filter: "blur(10px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.58,
            ease: premiumEase,
        },
    },
};

export function staggerContainer(stagger = 0.08, delay = 0): Variants {
    return {
        initial: {},
        animate: {
            transition: {
                delayChildren: delay,
                staggerChildren: stagger,
            },
        },
    };
}

export function delayedSection(delay = 0): Variants {
    return {
        initial: sectionMotion.initial,
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: {
                duration: 0.58,
                delay,
                ease: premiumEase,
            },
        },
    };
}

export function delayedCard(delay = 0): Variants {
    return {
        initial: cardMotion.initial,
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: {
                duration: 0.52,
                delay,
                ease: premiumEase,
            },
        },
    };
}