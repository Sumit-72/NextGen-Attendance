import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "./config/env";
import type { DeviceSignal, GeoPoint, SessionUser } from "./types/domain";

const encoder = new TextEncoder();

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function hashOtp(otp: string, sessionId: string) {
  return sha256(`${otp}:${sessionId}:${env.OTP_PEPPER ?? "dev-pepper"}`);
}

export function verifyHash(candidate: string, expected: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function generateOtp(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(randomInt(min, max + 1));
}

export function hashQrToken(token: string, sessionId: string) {
  return sha256(`${token}:${sessionId}:${env.QR_TOKEN_SECRET ?? "dev-qr-secret-dev-qr-secret"}`);
}

export function generateQrToken() {
  return randomBytes(24).toString("base64url");
}

export function fingerprintDevice(signal: DeviceSignal) {
  return sha256([signal.fingerprint, signal.userAgent?.slice(0, 180) ?? "unknown-ua", signal.ipAddress?.split(".").slice(0, 3).join(".") ?? "unknown-ip"].join("|"));
}

export async function signSession(user: SessionUser) {
  const secret = encoder.encode(env.JWT_SESSION_SECRET ?? "dev-session-secret-dev-session-secret");
  return new SignJWT({ user }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
}

export async function verifySessionToken(token: string) {
  const secret = encoder.encode(env.JWT_SESSION_SECRET ?? "dev-session-secret-dev-session-secret");
  const payload = await jwtVerify<{ user: SessionUser }>(token, secret);
  return payload.payload.user;
}

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint) {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
