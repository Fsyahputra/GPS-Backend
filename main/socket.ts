import { Server as IoServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Server as IoServerType } from "socket.io";

const setupSocket = (server: HTTPServer): IoServerType => {
  const io = new IoServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
    socket.emit("message", "Welcome to the socket server!");
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default setupSocket;
