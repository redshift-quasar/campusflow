import "server-only";
import { cookies } from "next/headers";

export const PESU_SESSION_COOKIE = "campusflow_pesu_session";
export const PESU_SRN_COOKIE = "campusflow_pesu_srn";

export async function getPesuSession() {
    const cookieStore = await cookies();

    const sessionToken = cookieStore.get(PESU_SESSION_COOKIE)?.value ?? null;
    const srn = cookieStore.get(PESU_SRN_COOKIE)?.value ?? null;

    return {
        connected: Boolean(sessionToken),
        sessionToken,
        srn,
    };
}