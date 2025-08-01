import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try {
        const connectDB = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST: ${connectDB.connection.host}`);
    } catch (error) {
        console.log("Error From Database Connection",error)
    }
}

export default connectDB;