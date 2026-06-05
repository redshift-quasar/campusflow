"use client";

import { useMemo, useState } from "react";
import {
    BookOpen,
    CheckCircle2,
    Download,
    FileText,
    FileWarning,
    Layers,
    Sparkles,
} from "lucide-react";
import {
    MOCK_STUDY_MATERIAL_CATALOG,
    type StudyMaterial,
} from "@/lib/pesu/study-materials";

function getTypeLabel(type: StudyMaterial["type"]) {
    if (type === "pdf") return "PDF";
    if (type === "ppt") return "PPT";
    if (type === "doc") return "DOC";
    if (type === "link") return "LINK";
    return "FILE";
}

function getTypeClasses(type: StudyMaterial["type"]) {
    if (type === "pdf") {
        return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    }

    if (type === "ppt") {
        return "border-blue-400/30 bg-blue-400/10 text-blue-200";
    }

    if (type === "doc") {
        return "border-blue-400/30 bg-blue-400/10 text-blue-200";
    }

    return "border-slate-400/30 bg-slate-400/10 text-slate-200";
}

export default function StudyMaterialsPage() {
    const catalog = MOCK_STUDY_MATERIAL_CATALOG;

    const [selectedSubjectCode, setSelectedSubjectCode] = useState(
        catalog.subjects[0]?.code ?? "",
    );
    const [selectedUnit, setSelectedUnit] = useState("All Units");
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState("");

    const selectedSubject = useMemo(() => {
        return catalog.subjects.find((subject) => subject.code === selectedSubjectCode);
    }, [catalog.subjects, selectedSubjectCode]);

    const filteredMaterials = useMemo(() => {
        return catalog.materials.filter((material) => {
            const matchesSubject = material.subjectCode === selectedSubjectCode;
            const matchesUnit = selectedUnit === "All Units" || material.unit === selectedUnit;

            return matchesSubject && matchesUnit;
        });
    }, [catalog.materials, selectedSubjectCode, selectedUnit]);

    const selectedMaterials = useMemo(() => {
        return catalog.materials.filter((material) =>
            selectedMaterialIds.includes(material.id),
        );
    }, [catalog.materials, selectedMaterialIds]);

    const selectedPdfCount = selectedMaterials.filter(
        (material) => material.type === "pdf",
    ).length;

    function handleSubjectChange(subjectCode: string) {
        setSelectedSubjectCode(subjectCode);
        setSelectedUnit("All Units");
        setStatusMessage("");
    }

    function handleUnitChange(unit: string) {
        setSelectedUnit(unit);
        setStatusMessage("");
    }

    function toggleMaterial(material: StudyMaterial) {
        if (material.type !== "pdf") {
            setStatusMessage("Only PDF materials can be combined right now.");
            return;
        }

        setStatusMessage("");

        setSelectedMaterialIds((currentIds) => {
            if (currentIds.includes(material.id)) {
                return currentIds.filter((id) => id !== material.id);
            }

            return [...currentIds, material.id];
        });
    }

    function handleMergeClick() {
        if (selectedPdfCount === 0) {
            setStatusMessage("Select at least one PDF before combining.");
            return;
        }

        setStatusMessage(
            `Merge API will be connected next. ${selectedPdfCount} PDF file${selectedPdfCount === 1 ? "" : "s"
            } selected.`,
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                                <Sparkles className="h-3.5 w-3.5" />
                                PESU Academy Material Organizer
                            </div>

                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                                    Study Material Hub
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                                    Pick a subject and unit, select PDF notes, and combine them
                                    into one clean study file.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <BookOpen className="h-4 w-4 text-cyan-300" />
                                    Subjects
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {catalog.subjects.length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <FileText className="h-4 w-4 text-violet-300" />
                                    Materials
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-white">
                                    {catalog.materials.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
                    <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-cyan-300" />
                            <h2 className="font-semibold text-white">Filters</h2>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                                    Subject
                                </label>

                                <select
                                    value={selectedSubjectCode}
                                    onChange={(event) => handleSubjectChange(event.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                                >
                                    {catalog.subjects.map((subject) => (
                                        <option key={subject.code} value={subject.code}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                                    Unit
                                </label>

                                <select
                                    value={selectedUnit}
                                    onChange={(event) => handleUnitChange(event.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                                >
                                    <option value="All Units">All Units</option>
                                    {selectedSubject?.units.map((unit) => (
                                        <option key={unit} value={unit}>
                                            {unit}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                                <p className="text-sm font-medium text-cyan-100">
                                    {selectedPdfCount} PDF selected
                                </p>
                                <p className="mt-1 text-xs leading-5 text-cyan-200/70">
                                    PPT, DOC, and link files are visible but cannot be merged in
                                    the first version.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleMergeClick}
                                disabled={selectedPdfCount === 0}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                            >
                                <Download className="h-4 w-4" />
                                Combine Selected PDFs
                            </button>

                            {statusMessage ? (
                                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                                    {statusMessage}
                                </div>
                            ) : null}
                        </div>
                    </aside>

                    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Selected subject</p>
                                <h2 className="text-xl font-semibold text-white">
                                    {selectedSubject?.name ?? "No subject selected"}
                                </h2>
                            </div>

                            <p className="text-sm text-slate-500">
                                Showing {filteredMaterials.length} material
                                {filteredMaterials.length === 1 ? "" : "s"}
                            </p>
                        </div>

                        {filteredMaterials.length === 0 ? (
                            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                                <FileWarning className="h-10 w-10 text-slate-500" />
                                <h3 className="mt-4 text-lg font-semibold text-white">
                                    No materials found
                                </h3>
                                <p className="mt-2 max-w-sm text-sm text-slate-400">
                                    Try selecting another subject or unit.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {filteredMaterials.map((material) => {
                                    const isSelected = selectedMaterialIds.includes(material.id);
                                    const isPdf = material.type === "pdf";

                                    return (
                                        <button
                                            key={material.id}
                                            type="button"
                                            onClick={() => toggleMaterial(material)}
                                            className={`group flex min-h-[190px] flex-col rounded-3xl border p-4 text-left transition ${isSelected
                                                    ? "border-cyan-400/60 bg-cyan-400/10"
                                                    : "border-white/10 bg-slate-900/70 hover:border-cyan-400/30 hover:bg-slate-900"
                                                } ${!isPdf ? "cursor-not-allowed opacity-75" : ""}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span
                                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTypeClasses(
                                                        material.type,
                                                    )}`}
                                                >
                                                    {getTypeLabel(material.type)}
                                                </span>

                                                {isSelected ? (
                                                    <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                                                ) : (
                                                    <span className="h-5 w-5 rounded-full border border-white/20" />
                                                )}
                                            </div>

                                            <div className="mt-4 flex-1">
                                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                                                    {material.unit}
                                                </p>

                                                <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
                                                    {material.title}
                                                </h3>

                                                {material.description ? (
                                                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                                                        {material.description}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-500">
                                                <span>{material.sizeLabel ?? "Unknown size"}</span>
                                                <span>{material.uploadedAt ?? "No date"}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </section>
            </div>
        </main>
    );
}
