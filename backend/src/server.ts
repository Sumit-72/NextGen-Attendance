import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { setRealtimeServer } from "./lib/realtime";
import { setupSocketServer } from "./socket";

const app = createApp();

// Define routes on Express
app.get("/", (_request, response) => {
  response.status(200).json({
    message: "Welcome to the Attendance Management System API",
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN ?? true,
    credentials: true,
  },
});

setRealtimeServer(io);
setupSocketServer(io);

httpServer.listen(env.PORT, () => {
  console.log(
    `attendance-backend listening on http://localhost:${env.PORT}`
  );
});
