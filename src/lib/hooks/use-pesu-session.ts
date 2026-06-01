"use client";

import { useCallback, useEffect, useState } from "react";

type PesuSession = {
    connected: boolean;
    srn: string | null;
    connectorMode: string;
};

export function usePesuSession() {
    const [session, setSession] = useState<PesuSession>({
        connected: false,
        srn: null,
        connectorMode: "mock",
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const refreshSession = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await fetch("/api/pesu/session", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Could not load PESU session");
            }

            const data = (await response.json()) as PesuSession;

            setSession({
                connected: data.connected,
                srn: data.srn,
                connectorMode: data.connectorMode ?? "mock",
            });

            setError("");
        } catch {
            setError("Could not check PESUAcademy connection.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    async function connect(srn: string, password: string) {
        try {
            setIsSubmitting(true);
            setError("");

            const response = await fetch("/api/pesu/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    srn,
                    password,
                }),
            });

            if (!response.ok) {
                throw new Error("Login failed");
            }

            const data = (await response.json()) as PesuSession;

            setSession({
                connected: data.connected,
                srn: data.srn,
                connectorMode: data.connectorMode ?? "mock",
            });
        } catch {
            setError("Could not connect PESUAcademy. Check SRN/password.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function disconnect() {
        try {
            setIsSubmitting(true);
            setError("");

            const response = await fetch("/api/pesu/logout", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            setSession({
                connected: false,
                srn: null,
                connectorMode: "mock",
            });
        } catch {
            setError("Could not disconnect PESUAcademy.");
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            void refreshSession();
        }, 0);

        return () => clearTimeout(timeout);
    }, [refreshSession]);

    return {
        session,
        isLoading,
        isSubmitting,
        error,
        connect,
        disconnect,
        refreshSession,
    };
}