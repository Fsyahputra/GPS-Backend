import { connect } from "mongoose";

const connectDB = async (URI: string): Promise<void> => {
  if (!URI) {
    throw new Error("Database URI is required");
  }
  try {
    await connect(URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Failed to connect to the database");
  }
  console.log("Database connected successfully");
};

export default connectDB;
