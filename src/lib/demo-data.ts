import type { AttendanceSubject, ResultItem } from "@/lib/academic-utils";

export type TodayClass = {
    time: string;
    duration: string;
    subject: string;
    code: string;
    room: string;
    faculty: string;
    status: "completed" | "ongoing" | "upcoming";
    type: "Lecture" | "Lab" | "Tutorial";
};

export type TimetableSlot = {
    day: string;
    time: string;
    endTime?: string;
    duration: string;
    subject: string;
    code: string;
    room: string;
    faculty: string;
    type: "Lecture" | "Lab" | "Tutorial";
};

export type ExamSeat = {
    id: string;
    exam: string;
    subject: string;
    code: string;
    date: string;
    time: string;
    room: string;
    block: string;
    seat: string;
};

export type SemesterRecord = {
    semester: string;
    sgpa: number;
    cgpa: number;
    credits: number;
};

export type DashboardUpdate = {
    title: string;
    detail: string;
    time: string;
};

export type CalendarEvent = {
    title: string;
    date: string;
    type: "holiday" | "exam" | "event" | "vacation" | "academic";
    description: string;
};

export const attendanceSubjects: AttendanceSubject[] = [
    {
        code: "UE23CS101A",
        name: "Problem Solving with C",
        faculty: "Dr. Meera N",
        attended: 32,
        total: 40,
        credits: 4,
    },
    {
        code: "UE23MA141A",
        name: "Engineering Mathematics",
        faculty: "Prof. Raghav S",
        attended: 27,
        total: 38,
        credits: 4,
    },
    {
        code: "UE23EC151A",
        name: "Digital Design",
        faculty: "Dr. Kavya R",
        attended: 24,
        total: 36,
        credits: 3,
    },
    {
        code: "UE23PHY102A",
        name: "Engineering Physics",
        faculty: "Prof. Ananya K",
        attended: 30,
        total: 34,
        credits: 3,
    },
    {
        code: "UE23ME111A",
        name: "Mechanical Engineering Sciences",
        faculty: "Prof. Naveen M",
        attended: 21,
        total: 32,
        credits: 3,
    },
    {
        code: "UE23EE121A",
        name: "Basic Electrical Engineering",
        faculty: "Dr. Shruthi V",
        attended: 29,
        total: 35,
        credits: 3,
    },
];

export const todayClasses: TodayClass[] = [
    {
        time: "09:00 - 09:50",
        duration: "50 min",
        subject: "Engineering Mathematics",
        code: "UE23MA141A",
        room: "A-312",
        faculty: "Prof. Raghav S",
        status: "completed",
        type: "Lecture",
    },
    {
        time: "10:00 - 10:50",
        duration: "50 min",
        subject: "Digital Design",
        code: "UE23EC151A",
        room: "B-204",
        faculty: "Dr. Kavya R",
        status: "ongoing",
        type: "Lecture",
    },
    {
        time: "11:10 - 12:00",
        duration: "50 min",
        subject: "Problem Solving with C",
        code: "UE23CS101A",
        room: "C-118",
        faculty: "Dr. Meera N",
        status: "upcoming",
        type: "Lecture",
    },
    {
        time: "14:00 - 15:40",
        duration: "100 min",
        subject: "Engineering Physics Lab",
        code: "UE23PHY102A",
        room: "Physics Lab 2",
        faculty: "Prof. Ananya K",
        status: "upcoming",
        type: "Lab",
    },
];

export const timetable: TimetableSlot[] = [
    {
        day: "Monday",
        time: "09:00 - 09:50",
        duration: "50 min",
        subject: "Engineering Mathematics",
        code: "UE23MA141A",
        room: "A-312",
        faculty: "Prof. Raghav S",
        type: "Lecture",
    },
    {
        day: "Monday",
        time: "10:00 - 10:50",
        duration: "50 min",
        subject: "Digital Design",
        code: "UE23EC151A",
        room: "B-204",
        faculty: "Dr. Kavya R",
        type: "Lecture",
    },
    {
        day: "Monday",
        time: "11:10 - 12:00",
        duration: "50 min",
        subject: "Problem Solving with C",
        code: "UE23CS101A",
        room: "C-118",
        faculty: "Dr. Meera N",
        type: "Lecture",
    },
    {
        day: "Tuesday",
        time: "09:00 - 10:40",
        duration: "100 min",
        subject: "Engineering Physics Lab",
        code: "UE23PHY102A",
        room: "Physics Lab 2",
        faculty: "Prof. Ananya K",
        type: "Lab",
    },
    {
        day: "Tuesday",
        time: "11:10 - 12:00",
        duration: "50 min",
        subject: "Mechanical Engineering Sciences",
        code: "UE23ME111A",
        room: "D-105",
        faculty: "Prof. Naveen M",
        type: "Lecture",
    },
    {
        day: "Wednesday",
        time: "09:00 - 09:50",
        duration: "50 min",
        subject: "Basic Electrical Engineering",
        code: "UE23EE121A",
        room: "E-220",
        faculty: "Dr. Shruthi V",
        type: "Lecture",
    },
    {
        day: "Wednesday",
        time: "10:00 - 11:40",
        duration: "100 min",
        subject: "Problem Solving with C Lab",
        code: "UE23CS101A",
        room: "CS Lab 4",
        faculty: "Dr. Meera N",
        type: "Lab",
    },
    {
        day: "Thursday",
        time: "09:00 - 09:50",
        duration: "50 min",
        subject: "Digital Design",
        code: "UE23EC151A",
        room: "B-204",
        faculty: "Dr. Kavya R",
        type: "Lecture",
    },
    {
        day: "Thursday",
        time: "10:00 - 10:50",
        duration: "50 min",
        subject: "Engineering Mathematics",
        code: "UE23MA141A",
        room: "A-312",
        faculty: "Prof. Raghav S",
        type: "Tutorial",
    },
    {
        day: "Friday",
        time: "09:00 - 09:50",
        duration: "50 min",
        subject: "Engineering Physics",
        code: "UE23PHY102A",
        room: "A-108",
        faculty: "Prof. Ananya K",
        type: "Lecture",
    },
];

export const results: ResultItem[] = [
    {
        code: "UE23CS101A",
        subject: "Problem Solving with C",
        total: 89,
        grade: "A",
        credits: 4,
    },
    {
        code: "UE23MA141A",
        subject: "Engineering Mathematics",
        total: 82,
        grade: "A",
        credits: 4,
    },
    {
        code: "UE23EC151A",
        subject: "Digital Design",
        total: 76,
        grade: "B",
        credits: 3,
    },
    {
        code: "UE23PHY102A",
        subject: "Engineering Physics",
        total: 91,
        grade: "S",
        credits: 3,
    },
    {
        code: "UE23ME111A",
        subject: "Mechanical Engineering Sciences",
        total: 68,
        grade: "B",
        credits: 3,
    },
    {
        code: "UE23EE121A",
        subject: "Basic Electrical Engineering",
        total: 73,
        grade: "B",
        credits: 3,
    },
];

export const semesters: SemesterRecord[] = [
    {
        semester: "Semester 1",
        sgpa: 8.42,
        cgpa: 8.42,
        credits: 20,
    },
    {
        semester: "Semester 2",
        sgpa: 8.71,
        cgpa: 8.56,
        credits: 22,
    },
];

export const exams: ExamSeat[] = [
    {
        id: "isa2-digital-design",
        exam: "ISA-2",
        subject: "Digital Design",
        code: "UE23EC151A",
        date: "Monday, 18 May",
        time: "09:30 - 10:30",
        room: "B-204",
        block: "B Block",
        seat: "B204-32",
    },
    {
        id: "isa2-engineering-mathematics",
        exam: "ISA-2",
        subject: "Engineering Mathematics",
        code: "UE23MA141A",
        date: "Wednesday, 20 May",
        time: "09:30 - 10:30",
        room: "A-312",
        block: "A Block",
        seat: "A312-18",
    },
    {
        id: "isa2-problem-solving-c",
        exam: "ISA-2",
        subject: "Problem Solving with C",
        code: "UE23CS101A",
        date: "Friday, 22 May",
        time: "09:30 - 10:30",
        room: "C-118",
        block: "C Block",
        seat: "C118-11",
    },
];

export const dashboardUpdates: DashboardUpdate[] = [
    {
        title: "ISA-2 seating released",
        detail: "Digital Design seating is available in the exam seating page.",
        time: "Today",
    },
    {
        title: "Attendance sync ready",
        detail: "Use sync to refresh subject-wise attendance from your local route.",
        time: "2h",
    },
    {
        title: "Timetable updated",
        detail: "Physics lab room has been updated for this week.",
        time: "Yesterday",
    },
];

export const calendarEvents: CalendarEvent[] = [
    {
        title: "ISA-2 Begins",
        date: "2026-05-18",
        type: "exam",
        description: "Internal assessment cycle starts.",
    },
    {
        title: "Project Review",
        date: "2026-05-25",
        type: "academic",
        description: "First-year project review window.",
    },
    {
        title: "Semester Break",
        date: "2026-06-08",
        type: "vacation",
        description: "Tentative academic break.",
    },
    {
        title: "Holiday",
        date: "2026-06-15",
        type: "holiday",
        description: "No instructional classes.",
    },
];

export const holidays = calendarEvents.filter((event) => event.type === "holiday");

export const semesterEvents = calendarEvents;

export const quickLinks = [
    {
        label: "Attendance",
        href: "/attendance",
        detail: "Risk and recovery",
    },
    {
        label: "Timetable",
        href: "/timetable",
        detail: "Weekly classes",
    },
    {
        label: "Results",
        href: "/results",
        detail: "Marks and grades",
    },
    {
        label: "Seating",
        href: "/seating",
        detail: "Exam room and seat",
    },
];
export type WeekDay = {
    label: string;
    short: string;
    date: string;
    classes: number;
    status: "light" | "normal" | "heavy";
    focus: string;
};

export const weekDays: WeekDay[] = [
    {
        label: "Monday",
        short: "Mon",
        date: "11",
        classes: 3,
        status: "normal",
        focus: "Maths, Digital Design, C",
    },
    {
        label: "Tuesday",
        short: "Tue",
        date: "12",
        classes: 2,
        status: "light",
        focus: "Physics Lab, MES",
    },
    {
        label: "Wednesday",
        short: "Wed",
        date: "13",
        classes: 2,
        status: "light",
        focus: "Electrical, C Lab",
    },
    {
        label: "Thursday",
        short: "Thu",
        date: "14",
        classes: 2,
        status: "light",
        focus: "Digital Design, Maths Tutorial",
    },
    {
        label: "Friday",
        short: "Fri",
        date: "15",
        classes: 1,
        status: "light",
        focus: "Engineering Physics",
    },
    {
        label: "Saturday",
        short: "Sat",
        date: "16",
        classes: 0,
        status: "light",
        focus: "No regular classes",
    },
];
export const timetableDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
