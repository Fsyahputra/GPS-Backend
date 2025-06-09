import app from "./main/app";
import { createServer } from "http";
import setupSocket from "./main/socket";
import dotenv from "dotenv";
import connectDB from "./main/database";
dotenv.config();
const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.ADDRESS || "localhost";
const DB_ADDRESS = process.env.DB_ADDRESS || "localhost";
const DB_PORT = process.env.DB_PORT || "27017";
const DB_URI = `mongodb://${DB_ADDRESS}:${DB_PORT}/GPS-Tracker`;
const server = createServer(app);
const io = setupSocket(server);

connectDB(DB_URI).then(() => {
  console.log(`Connected to MongoDB at ${DB_URI}`);
  server.listen(PORT, () => {
    console.log(`Server is running on http://${ADDRESS}:${PORT}`);
    console.log(`Socket.io server is running on http://${ADDRESS}:${PORT}`);
  });
});
