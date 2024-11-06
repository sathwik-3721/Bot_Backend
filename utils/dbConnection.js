import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DbConfig = {
    uri: process.env.MONGO_URI,
};

const connectDB = (async () => {
    try {
      await mongoose.connect(DbConfig.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("Connected !!")
      logger.info("MongoDB connected");
    } catch (error) {
      logger.error("Database connection failed!", error);
      console.log("Failed !!")
      process.exit(1);
    }
  })();

export default connectDB;