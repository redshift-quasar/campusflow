"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type DemoUser = {
    name: string;
    username: string;
};

type AuthState = {
    user: DemoUser | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;

    login: (username: string) => void;
    logout: () => void;
    setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            hasHydrated: false,

            login: (username) =>
                set({
                    user: {
                        name: "Atharva Patel",
                        username,
                    },
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),

            setHasHydrated: (value) =>
                set({
                    hasHydrated: value,
                }),
        }),
        {
            name: "campusflow-auth",
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);