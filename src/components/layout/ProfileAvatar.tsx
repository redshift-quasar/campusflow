"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound, X } from "lucide-react";

export function ProfileAvatar({
    name,
    photoDataUrl,
    compact = false,
    size = "default",
}: {
    name: string;
    photoDataUrl?: string;
    compact?: boolean;
    size?: "default" | "nav";
}) {
    const [previewOpen, setPreviewOpen] = useState(false);

    const sizeClass = compact
        ? "h-7 w-7 rounded-xl"
        : size === "nav"
            ? "h-10 w-10 rounded-2xl"
            : "h-14 w-14 rounded-[1.25rem]";
    const imageSizes = compact ? "28px" : size === "nav" ? "80px" : "112px";
    const fallbackSize = compact ? 15 : size === "nav" ? 17 : 20;
    const fallbackTextClass = size === "nav" ? "text-sm" : "text-base";
    const statusClass = compact
        ? "bottom-0.5 right-0.5 h-2 w-2 border"
        : size === "nav"
            ? "bottom-0.5 right-0.5 h-2 w-2 border"
            : "bottom-1 right-1 h-2.5 w-2.5 border-2";

    const fallbackText = name?.trim()?.slice(0, 1)?.toUpperCase() || "S";



    useEffect(() => {
        if (!previewOpen) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setPreviewOpen(false);
            }
        }

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [previewOpen]);

    const preview =
        previewOpen && photoDataUrl && typeof document !== "undefined"
            ? createPortal(
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-label="PESU profile photo preview"
                >
                    <div
                        className="relative overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#050814] p-3 shadow-2xl shadow-black"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xl transition hover:bg-white hover:text-slate-950"
                            aria-label="Close preview"
                        >
                            <X size={16} />
                        </button>

                        <div
                            className="relative block h-[min(74vh,760px)] w-[min(86vw,560px)] overflow-hidden rounded-[1.5rem] bg-black/25"
                        >
                            <Image
                                src={photoDataUrl}
                                alt={name}
                                fill
                                sizes="(max-width: 640px) 86vw, 560px"
                                unoptimized
                                className="h-full w-full object-contain object-center brightness-[1.03] contrast-[1.08] saturate-[1.1]"
                            />
                        </div>

                        <div className="px-2 py-3">
                            <p className="text-sm font-black text-white">{name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                PESU profile photo
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )
            : null;

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    if (photoDataUrl && !compact) {
                        setPreviewOpen(true);
                    }
                }}
                className={`group relative flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.06] text-[#b7a8ff] ring-1 ring-white/[0.08] transition duration-300 hover:scale-105 hover:ring-white/[0.18] ${sizeClass}`}
            >
                {photoDataUrl ? (
                    <Image
                        src={photoDataUrl}
                        alt={name}
                        fill
                        unoptimized
                        sizes={imageSizes}
                        loading="eager"
                        className="h-full w-full scale-[1.01] object-cover object-top brightness-[1.03] contrast-[1.08] saturate-[1.1]"
                        style={{
                            imageRendering: "auto",
                        }}
                    />
                ) : compact ? (
                    <UserRound size={fallbackSize} />
                ) : size === "nav" ? (
                    <UserRound size={fallbackSize} />
                ) : (
                    <span className={`${fallbackTextClass} font-black`}>
                        {fallbackText}
                    </span>
                )}

                {!compact && photoDataUrl && (
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/20 opacity-0 transition group-hover:opacity-100" />
                )}

                <span className={`absolute rounded-full border-[#050814] bg-emerald-400 shadow-lg shadow-emerald-400/40 ${statusClass}`} />
            </button>

            {preview}
        </>
    );
}
