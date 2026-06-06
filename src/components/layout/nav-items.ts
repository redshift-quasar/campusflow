import type { LucideIcon } from "lucide-react";
import {
    Armchair,
    BarChart3,
    BookOpen,
    CalendarDays,
    Calculator,
    Clock3,
    GraduationCap,
    LayoutDashboard,
    Settings as SettingsIcon,
} from "lucide-react";

export type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

export const navItems: NavItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Today",
        href: "/today",
        icon: Clock3,
    },
    {
        label: "Timetable",
        href: "/timetable",
        icon: CalendarDays,
    },
    {
        label: "Attendance",
        href: "/attendance",
        icon: BarChart3,
    },
    {
        label: "Predictor",
        href: "/predictor",
        icon: Calculator,
    },
    {
        label: "Study Hub",
        href: "/study-materials",
        icon: BookOpen,
    },
    {
        label: "Results",
        href: "/results",
        icon: GraduationCap,
    },
    {
        label: "Seating",
        href: "/seating",
        icon: Armchair,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
    },
];
