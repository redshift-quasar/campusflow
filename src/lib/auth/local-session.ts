export type LocalUser = {
    srn: string;
    name?: string;
    createdAt: string;
};

export const LOCAL_AUTH_KEY = "campusflow_local_user";
export const LOCAL_AUTH_EVENT = "campusflow_local_auth_changed";

export function getStoredLocalUser(): LocalUser | null {
    if (typeof window === "undefined") return null;

    const storedUser = localStorage.getItem(LOCAL_AUTH_KEY);

    if (!storedUser) return null;

    try {
        return JSON.parse(storedUser) as LocalUser;
    } catch {
        localStorage.removeItem(LOCAL_AUTH_KEY);
        notifyLocalAuthChanged();
        return null;
    }
}

export function saveLocalUser(user: LocalUser) {
    if (typeof window === "undefined") return;

    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    notifyLocalAuthChanged();
}

export function clearLocalUser() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(LOCAL_AUTH_KEY);
    notifyLocalAuthChanged();
}

export function createLocalUser({
    srn,
    name,
}: {
    srn: string;
    name?: string;
}): LocalUser {
    return {
        srn: srn.trim().toUpperCase(),
        name: name?.trim() || undefined,
        createdAt: new Date().toISOString(),
    };
}

function notifyLocalAuthChanged() {
    if (typeof window === "undefined") return;

    window.dispatchEvent(new Event(LOCAL_AUTH_EVENT));
}