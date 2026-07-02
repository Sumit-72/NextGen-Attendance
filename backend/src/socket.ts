import type { Server, Socket } from "socket.io";
import { verifySessionToken } from "./security";
import type { SessionUser } from "./types/domain";

type AuthedSocket = Socket & {
  data: {
    user: SessionUser;
  };
};

export function setupSocketServer(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || token.length < 10) {
        return next(new Error("Authentication required"));
      }

      const user = await verifySessionToken(token);
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Invalid session"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    socket.on("join:session", ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId) return;
      socket.join(`session:${sessionId}`);
    });

    socket.on("leave:session", ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId) return;
      socket.leave(`session:${sessionId}`);
    });

    socket.on("join:class", ({ classId }: { classId?: string }) => {
      if (!classId) return;
      socket.join(`class:${classId}`);
    });

    socket.on("leave:class", ({ classId }: { classId?: string }) => {
      if (!classId) return;
      socket.leave(`class:${classId}`);
    });
  });
}
