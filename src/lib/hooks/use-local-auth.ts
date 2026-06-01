"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
    clearLocalUser,
    LOCAL_AUTH_EVENT,
    LOCAL_AUTH_KEY,
    type LocalUser,
} from "@/lib/auth/local-session";

export type { LocalUser };

let cachedRawUser: string | null = null;
let cachedUser: LocalUser | null = null;

function readLocalUserSnapshot(): LocalUser | null {
    if (typeof window === "undefined") return null;

    const rawUser = localStorage.getItem(LOCAL_AUTH_KEY);

    if (rawUser === cachedRawUser) {
        return cachedUser;
    }

    cachedRawUser = rawUser;

    if (!rawUser) {
        cachedUser = null;
        return cachedUser;
    }

    try {
        cachedUser = JSON.parse(rawUser) as LocalUser;
        return cachedUser;
    } catch {
        localStorage.removeItem(LOCAL_AUTH_KEY);
        cachedRawUser = null;
        cachedUser = null;
        return null;
    }
}

function getServerSnapshot(): LocalUser | null {
    return null;
}

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(LOCAL_AUTH_EVENT, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(LOCAL_AUTH_EVENT, callback);
    };
}

export function useLocalAuth({
    redirectIfMissing = false,
}: {
    redirectIfMissing?: boolean;
} = {}) {
    const router = useRouter();

    const user = useSyncExternalStore(
        subscribe,
        readLocalUserSnapshot,
        getServerSnapshot
    );

    const isLoggedIn = Boolean(user);

    useEffect(() => {
        if (redirectIfMissing && !user && !readLocalUserSnapshot()) {
            router.replace("/");
        }
    }, [redirectIfMissing, router, user]);

    function logout() {
        clearLocalUser();
        router.replace("/");
    }

    return {
        user,
        ready: true,
        logout,
        isLoggedIn,
    };
}
