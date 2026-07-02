"use client";

import { io, type Socket } from "socket.io-client";
import { getSessionToken } from "./auth-storage";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") : "http://localhost:4000");

let socket: Socket | null = null;

export function getAttendanceSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = getSessionToken();
  if (!token) {
    return null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectAttendanceSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinSessionRoom(sessionId: string) {
  getAttendanceSocket()?.emit("join:session", { sessionId });
}

export function leaveSessionRoom(sessionId: string) {
  getAttendanceSocket()?.emit("leave:session", { sessionId });
}

export function joinClassRoom(classId: string) {
  getAttendanceSocket()?.emit("join:class", { classId });
}

export function leaveClassRoom(classId: string) {
  getAttendanceSocket()?.emit("leave:class", { classId });
}
