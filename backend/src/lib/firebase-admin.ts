import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { AuthError } from "../errors";
import { env } from "../config/env";

type DecodedFirebaseToken = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: "STUDENT" | "TEACHER" | "ADMIN";
};

let firebaseApp: App | undefined;

export function isFirebaseConfigured() {
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

function getPrivateKey() {
  const rawKey = env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) {
    return undefined;
  }

  const key = rawKey.trim().replace(/,$/, "").replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (key.includes("\n")) {
    return key;
  }

  const match = key.match(/^-+BEGIN PRIVATE KEY-+\s*(.+?)\s*-+END PRIVATE KEY-+$/);
  if (!match) {
    return key;
  }

  return `-----BEGIN PRIVATE KEY-----\n${match[1].replace(/\s+/g, "")}\n-----END PRIVATE KEY-----`;
}

function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!isFirebaseConfigured()) {
    throw new AuthError("Firebase admin credentials are not configured");
  }

  firebaseApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey(),
      }),
    });

  return firebaseApp;
}

function parseDevToken(idToken: string): DecodedFirebaseToken {
  const parts = idToken.split(":");
  if (parts.length < 5) {
    throw new AuthError("Invalid development auth token");
  }

  const [, rawRole, uid, email, ...nameParts] = parts;
  const role = rawRole.toUpperCase();
  if (role !== "STUDENT" && role !== "TEACHER" && role !== "ADMIN") {
    throw new AuthError("Invalid development auth role");
  }

  return {
    uid,
    email,
    name: decodeURIComponent(nameParts.join(":")),
    picture: undefined,
    role: role as DecodedFirebaseToken["role"],
  };
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (idToken.startsWith("dev:") && env.NODE_ENV !== "production") {
    return parseDevToken(idToken);
  }

  if (!isFirebaseConfigured()) {
    throw new AuthError("Firebase admin credentials are not configured");
  }

  const { getAuth } = await import("firebase-admin/auth");
  try {
    return (await getAuth(getFirebaseApp()).verifyIdToken(idToken, true)) as DecodedFirebaseToken;
  } catch {
    throw new AuthError("Invalid Firebase identity token");
  }
}
