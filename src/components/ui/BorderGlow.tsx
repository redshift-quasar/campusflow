"use client";

import {
    useCallback,
    useEffect,
    useRef,
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
} from "react";
import "./BorderGlow.css";

type BorderGlowProps = {
    children?: ReactNode;
    className?: string;
    edgeSensitivity?: number;
    glowColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
    glowRadius?: number;
    glowIntensity?: number;
    coneSpread?: number;
    animated?: boolean;
    colors?: string[];
    fillOpacity?: number;
};

type HslColor = {
    h: number;
    s: number;
    l: number;
};

type AnimatedValueOptions = {
    start?: number;
    end?: number;
    duration?: number;
    delay?: number;
    ease?: (value: number) => number;
    onUpdate: (value: number) => void;
    onEnd?: () => void;
};

type BorderGlowStyle = CSSProperties & {
    "--card-bg": string;
    "--edge-sensitivity": number;
    "--border-radius": string;
    "--glow-padding": string;
    "--cone-spread": number;
    "--fill-opacity": number;
};

const GRADIENT_POSITIONS = [
    "80% 55%",
    "69% 34%",
    "8% 6%",
    "41% 38%",
    "86% 85%",
    "82% 18%",
    "51% 4%",
];

const GRADIENT_KEYS = [
    "--gradient-one",
    "--gradient-two",
    "--gradient-three",
    "--gradient-four",
    "--gradient-five",
    "--gradient-six",
    "--gradient-seven",
];

const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function parseHsl(hslString: string): HslColor {
    const match = hslString.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);

    if (!match) {
        return {
            h: 40,
            s: 80,
            l: 80,
        };
    }

    return {
        h: Number.parseFloat(match[1]),
        s: Number.parseFloat(match[2]),
        l: Number.parseFloat(match[3]),
    };
}

function buildGlowVars(
    glowColor: string,
    intensity: number
): Record<string, string> {
    const { h, s, l } = parseHsl(glowColor);
    const base = `${h}deg ${s}% ${l}%`;

    const opacities = [100, 60, 50, 40, 30, 20, 10];
    const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];

    return opacities.reduce<Record<string, string>>((vars, opacity, index) => {
        vars[`--glow-color${keys[index]}`] = `hsl(${base} / ${Math.min(
            opacity * intensity,
            100
        )}%)`;

        return vars;
    }, {});
}

function buildGradientVars(colors: string[]): Record<string, string> {
    const safeColors = colors.length > 0 ? colors : ["#c084fc"];

    const vars = GRADIENT_KEYS.reduce<Record<string, string>>((result, key, index) => {
        const colorIndex = Math.min(COLOR_MAP[index], safeColors.length - 1);
        const color = safeColors[colorIndex];

        result[key] = `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0px, transparent 50%)`;

        return result;
    }, {});

    vars["--gradient-base"] = `linear-gradient(${safeColors[0]} 0 100%)`;

    return vars;
}

function easeOutCubic(value: number) {
    return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number) {
    return value * value * value;
}

function animateValue({
    start = 0,
    end = 100,
    duration = 1000,
    delay = 0,
    ease = easeOutCubic,
    onUpdate,
    onEnd,
}: AnimatedValueOptions) {
    let frameId = 0;
    let timeoutId = 0;

    const startTime = performance.now() + delay;

    function tick() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        onUpdate(start + (end - start) * ease(progress));

        if (progress < 1) {
            frameId = requestAnimationFrame(tick);
        } else {
            onEnd?.();
        }
    }

    timeoutId = window.setTimeout(() => {
        frameId = requestAnimationFrame(tick);
    }, delay);

    return () => {
        window.clearTimeout(timeoutId);
        cancelAnimationFrame(frameId);
    };
}

export default function BorderGlow({
    children,
    className = "",
    edgeSensitivity = 30,
    glowColor = "40 80 80",
    backgroundColor = "#120f17",
    borderRadius = 28,
    glowRadius = 40,
    glowIntensity = 1,
    coneSpread = 25,
    animated = false,
    colors = ["#c084fc", "#f472b6", "#38bdf8"],
    fillOpacity = 0.45,
}: BorderGlowProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const getCenter = useCallback((element: HTMLElement) => {
        const { width, height } = element.getBoundingClientRect();

        return {
            x: width / 2,
            y: height / 2,
        };
    }, []);

    const getEdgeProximity = useCallback(
        (element: HTMLElement, x: number, y: number) => {
            const center = getCenter(element);

            const dx = x - center.x;
            const dy = y - center.y;

            let kx = Infinity;
            let ky = Infinity;

            if (dx !== 0) {
                kx = center.x / Math.abs(dx);
            }

            if (dy !== 0) {
                ky = center.y / Math.abs(dy);
            }

            return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
        },
        [getCenter]
    );

    const getCursorAngle = useCallback(
        (element: HTMLElement, x: number, y: number) => {
            const center = getCenter(element);

            const dx = x - center.x;
            const dy = y - center.y;

            if (dx === 0 && dy === 0) return 0;

            const radians = Math.atan2(dy, dx);
            let degrees = radians * (180 / Math.PI) + 90;

            if (degrees < 0) {
                degrees += 360;
            }

            return degrees;
        },
        [getCenter]
    );

    const handlePointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const card = cardRef.current;

            if (!card) return;

            const rect = card.getBoundingClientRect();

            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const edge = getEdgeProximity(card, x, y);
            const angle = getCursorAngle(card, x, y);

            card.style.setProperty("--edge-proximity", `${(edge * 100).toFixed(3)}`);
            card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
        },
        [getCursorAngle, getEdgeProximity]
    );

    const handlePointerLeave = useCallback(() => {
        const card = cardRef.current;

        if (!card) return;

        card.style.setProperty("--edge-proximity", "0");
    }, []);

    useEffect(() => {
        if (!animated || !cardRef.current) return;

        const card = cardRef.current;

        const angleStart = 110;
        const angleEnd = 465;

        const cleanups: Array<() => void> = [];

        card.classList.add("sweep-active");
        card.style.setProperty("--cursor-angle", `${angleStart}deg`);

        cleanups.push(
            animateValue({
                duration: 500,
                onUpdate: (value) => {
                    card.style.setProperty("--edge-proximity", `${value}`);
                },
            })
        );

        cleanups.push(
            animateValue({
                ease: easeInCubic,
                duration: 1500,
                end: 50,
                onUpdate: (value) => {
                    card.style.setProperty(
                        "--cursor-angle",
                        `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`
                    );
                },
            })
        );

        cleanups.push(
            animateValue({
                ease: easeOutCubic,
                delay: 1500,
                duration: 2250,
                start: 50,
                end: 100,
                onUpdate: (value) => {
                    card.style.setProperty(
                        "--cursor-angle",
                        `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`
                    );
                },
            })
        );

        cleanups.push(
            animateValue({
                ease: easeInCubic,
                delay: 2500,
                duration: 1500,
                start: 100,
                end: 0,
                onUpdate: (value) => {
                    card.style.setProperty("--edge-proximity", `${value}`);
                },
                onEnd: () => {
                    card.classList.remove("sweep-active");
                },
            })
        );

        return () => {
            cleanups.forEach((cleanup) => cleanup());
            card.classList.remove("sweep-active");
        };
    }, [animated]);

    const style = {
        "--card-bg": backgroundColor,
        "--edge-sensitivity": edgeSensitivity,
        "--border-radius": `${borderRadius}px`,
        "--glow-padding": `${glowRadius}px`,
        "--cone-spread": coneSpread,
        "--fill-opacity": fillOpacity,
        ...buildGlowVars(glowColor, glowIntensity),
        ...buildGradientVars(colors),
    } as BorderGlowStyle;

    return (
        <div
            ref={cardRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className={`border-glow-card ${className}`}
            style={style}
        >
            <span className="edge-light" />

            <div className="border-glow-inner">{children}</div>
        </div>
    );
}