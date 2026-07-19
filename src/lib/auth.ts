import { logEvent } from "@/utils/sentry";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

const cookieName = "auth-token";

// Encript and sing token
export async function singAuthToken(payload: any) {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return token;
  } catch (error) {
    logEvent("Token singing failed.", "auth", { payload }, "error", error);
    throw new Error("Token signing failed");
  }
}

// Decrupt and varify token
export async function verifyAuthToken<T>(token: string): Promise<T> {
  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as T;
  } catch (error) {
    logEvent(
      "Token decryption failed.",
      "auth",
      { tokenSnippet: token.slice(0, 10) },
      "error",
      error,
    );

    throw new Error("Token decryption failed");
  }
}

// Set the auth cookies
export async function setAuthCookie(token: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch (error) {
    logEvent("Failed to set cookie", "auth", { token }, "error", error);
  }
}

// Get auth toke from cookie
export async function getAUthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName);
  return token?.value;
}

// Remove auth toke cookie
export async function removeAuthCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(cookieName);
  } catch (error) {
    logEvent("Failed to remove auth cookie", "auth", {}, "error", error);
  }
}
