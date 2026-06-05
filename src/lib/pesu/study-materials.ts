export type StudyMaterialType = "pdf" | "ppt" | "doc" | "link" | "unknown";

export type StudyMaterial = {
    id: string;
    subjectCode: string;
    subjectName: string;
    unit: string;
    title: string;
    description: string;
    type: StudyMaterialType;
    sizeLabel: string;
    uploadedAt: string;
};

export type StudySubject = {
    code: string;
    name: string;
    units: string[];
};

export type StudyMaterialCatalog = {
    subjects: StudySubject[];
    materials: StudyMaterial[];
};

export const MOCK_STUDY_MATERIAL_CATALOG: StudyMaterialCatalog = {
    subjects: [
        {
            code: "UE24CS151A",
            name: "Problem Solving with C",
            units: ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"],
        },
        {
            code: "UE24MA141B",
            name: "Mathematics II",
            units: ["Unit 1", "Unit 2", "Unit 3", "Unit 4"],
        },
        {
            code: "UE24PH141A",
            name: "Physics",
            units: ["Unit 1", "Unit 2", "Unit 3", "Unit 4"],
        },
    ],
    materials: [
        {
            id: "c-unit1-pdf-1",
            subjectCode: "UE24CS151A",
            subjectName: "Problem Solving with C",
            unit: "Unit 1",
            title: "Introduction to C Programming",
            description: "Basics of C, tokens, variables, constants, and operators.",
            type: "pdf",
            sizeLabel: "2.4 MB",
            uploadedAt: "2026-01-12",
        },
        {
            id: "c-unit1-ppt-1",
            subjectCode: "UE24CS151A",
            subjectName: "Problem Solving with C",
            unit: "Unit 1",
            title: "C Basics Classroom Slides",
            description: "Lecture slides for the first unit.",
            type: "ppt",
            sizeLabel: "5.1 MB",
            uploadedAt: "2026-01-13",
        },
        {
            id: "c-unit2-pdf-1",
            subjectCode: "UE24CS151A",
            subjectName: "Problem Solving with C",
            unit: "Unit 2",
            title: "Control Statements and Loops",
            description: "If-else, switch, while, do-while, and for loops.",
            type: "pdf",
            sizeLabel: "3.2 MB",
            uploadedAt: "2026-01-20",
        },
        {
            id: "c-unit3-doc-1",
            subjectCode: "UE24CS151A",
            subjectName: "Problem Solving with C",
            unit: "Unit 3",
            title: "Arrays and Strings Practice Sheet",
            description: "Short programming drills for one-dimensional arrays, strings, and functions.",
            type: "doc",
            sizeLabel: "740 KB",
            uploadedAt: "2026-01-27",
        },
        {
            id: "c-unit4-link-1",
            subjectCode: "UE24CS151A",
            subjectName: "Problem Solving with C",
            unit: "Unit 4",
            title: "Pointers Reference Guide",
            description: "A curated reference link for pointer notation, memory layout, and examples.",
            type: "link",
            sizeLabel: "External",
            uploadedAt: "2026-02-03",
        },
        {
            id: "math-unit2-pdf-1",
            subjectCode: "UE24MA141B",
            subjectName: "Mathematics II",
            unit: "Unit 2",
            title: "Multiple Integrals Notes",
            description: "Double integrals, change of order, and applications.",
            type: "pdf",
            sizeLabel: "4.6 MB",
            uploadedAt: "2026-02-02",
        },
        {
            id: "math-unit3-pdf-1",
            subjectCode: "UE24MA141B",
            subjectName: "Mathematics II",
            unit: "Unit 3",
            title: "Vector Calculus Material",
            description: "Gradient, divergence, curl, and important theorems.",
            type: "pdf",
            sizeLabel: "3.9 MB",
            uploadedAt: "2026-02-11",
        },
        {
            id: "math-unit3-ppt-1",
            subjectCode: "UE24MA141B",
            subjectName: "Mathematics II",
            unit: "Unit 3",
            title: "Green and Stokes Theorem Slides",
            description: "Classroom presentation covering theorem statements and worked examples.",
            type: "ppt",
            sizeLabel: "6.8 MB",
            uploadedAt: "2026-02-14",
        },
        {
            id: "math-unit4-link-1",
            subjectCode: "UE24MA141B",
            subjectName: "Mathematics II",
            unit: "Unit 4",
            title: "Laplace Transform Formula Sheet",
            description: "Reference link for common transform pairs and inverse transform shortcuts.",
            type: "link",
            sizeLabel: "External",
            uploadedAt: "2026-02-18",
        },
        {
            id: "physics-unit3-pdf-1",
            subjectCode: "UE24PH141A",
            subjectName: "Physics",
            unit: "Unit 3",
            title: "Quantum Free Electron Theory",
            description: "Density of states, Fermi energy, and related derivations.",
            type: "pdf",
            sizeLabel: "6.3 MB",
            uploadedAt: "2026-02-15",
        },
        {
            id: "physics-unit4-pdf-1",
            subjectCode: "UE24PH141A",
            subjectName: "Physics",
            unit: "Unit 4",
            title: "Lasers and Optical Fibres",
            description: "Laser basics, properties, types, and optical fibre notes.",
            type: "pdf",
            sizeLabel: "5.8 MB",
            uploadedAt: "2026-02-20",
        },
        {
            id: "physics-unit1-doc-1",
            subjectCode: "UE24PH141A",
            subjectName: "Physics",
            unit: "Unit 1",
            title: "Oscillations Tutorial Questions",
            description: "Concept checks and numericals for damped and forced oscillations.",
            type: "doc",
            sizeLabel: "920 KB",
            uploadedAt: "2026-01-16",
        },
        {
            id: "physics-unit2-ppt-1",
            subjectCode: "UE24PH141A",
            subjectName: "Physics",
            unit: "Unit 2",
            title: "Wave Optics Slides",
            description: "Presentation deck for interference, diffraction, and polarization basics.",
            type: "ppt",
            sizeLabel: "7.2 MB",
            uploadedAt: "2026-01-28",
        },
    ],
};
