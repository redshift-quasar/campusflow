"use client";

import { useState, type FormEvent } from "react";
import { PlusCircle, Save, X } from "lucide-react";

import type { PredictorAttendanceSubject } from "@/lib/attendance-predictor";

export type AttendancePredictorFormPayload =
    Omit<PredictorAttendanceSubject, "id" | "percentage"> & {
        id?: string;
    };

type AttendancePredictorFormProps = {
    editingSubject: PredictorAttendanceSubject | null;
    onSubmit: (subject: AttendancePredictorFormPayload) => void;
    onCancelEdit: () => void;
};

const inputClass =
    "w-full rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-700 focus:border-[#b7a8ff]/40 focus:bg-white/[0.065]";

const emptyForm = {
    name: "",
    code: "",
    attended: "",
    total: "",
    remainingClasses: "",
};

function getInitialForm(subject: PredictorAttendanceSubject | null) {
    if (!subject) return emptyForm;

    return {
        name: subject.name,
        code: subject.code ?? "",
        attended: String(subject.attended),
        total: String(subject.total),
        remainingClasses:
            subject.remainingClasses === undefined
                ? ""
                : String(subject.remainingClasses),
    };
}

function parseClassCount(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
}

function parseOptionalClassCount(value: string) {
    if (value.trim() === "") return undefined;

    return parseClassCount(value);
}

export function AttendancePredictorForm({
    editingSubject,
    onSubmit,
    onCancelEdit,
}: AttendancePredictorFormProps) {
    const [form, setForm] = useState(() => getInitialForm(editingSubject));
    const [error, setError] = useState("");

    function updateField(field: keyof typeof form, value: string) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = form.name.trim();
        const code = form.code.trim();
        const attended = parseClassCount(form.attended);
        const total = parseClassCount(form.total);
        const remainingClasses = parseOptionalClassCount(form.remainingClasses);

        if (!name) {
            setError("Subject name is required.");
            return;
        }

        if (attended > total) {
            setError("Attended classes cannot be greater than total classes.");
            return;
        }

        onSubmit({
            id: editingSubject?.id,
            name,
            code: code || undefined,
            attended,
            total,
            remainingClasses,
        });

        if (!editingSubject) {
            setForm(emptyForm);
        }

        setError("");
    }

    return (
        <form onSubmit={handleSubmit} className="studio-card p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                        Manual Subject
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                        {editingSubject ? "Edit Subject" : "Add Subject"}
                    </h2>

                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Manual fallback data stays local and separate from PESU sync.
                    </p>
                </div>

                {editingSubject && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.055] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                        aria-label="Cancel editing"
                    >
                        <X size={17} />
                    </button>
                )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                        Subject name
                    </span>
                    <input
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder="Mathematics for CSE"
                        className={inputClass}
                    />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                        Subject code
                    </span>
                    <input
                        value={form.code}
                        onChange={(event) => updateField("code", event.target.value)}
                        placeholder="UE24CS201"
                        className={inputClass}
                    />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                        Remaining classes
                    </span>
                    <input
                        value={form.remainingClasses}
                        onChange={(event) =>
                            updateField("remainingClasses", event.target.value)
                        }
                        type="number"
                        min={0}
                        placeholder="Optional"
                        className={inputClass}
                    />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                        Attended
                    </span>
                    <input
                        value={form.attended}
                        onChange={(event) => updateField("attended", event.target.value)}
                        type="number"
                        min={0}
                        placeholder="0"
                        className={inputClass}
                    />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold text-slate-300">
                        Total
                    </span>
                    <input
                        value={form.total}
                        onChange={(event) => updateField("total", event.target.value)}
                        type="number"
                        min={0}
                        placeholder="0"
                        className={inputClass}
                    />
                </label>
            </div>

            {error && (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">
                    {error}
                </div>
            )}

            <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[#ded7ff]"
            >
                {editingSubject ? <Save size={16} /> : <PlusCircle size={16} />}
                {editingSubject ? "Save Subject" : "Add Subject"}
            </button>
        </form>
    );
}
