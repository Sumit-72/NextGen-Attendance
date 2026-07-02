import type { Server } from "socket.io";

let io: Server | undefined;

export function setRealtimeServer(server: Server) {
  io = server;
}

export function getRealtimeServer() {
  return io;
}

export function emitToSession(sessionId: string, event: string, payload: unknown) {
  io?.to(`session:${sessionId}`).emit(event, payload);
}

export function emitToClass(classId: string, event: string, payload: unknown) {
  io?.to(`class:${classId}`).emit(event, payload);
}
