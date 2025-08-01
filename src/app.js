import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

// MiddleWarse
app.use( express.json() );
app.use( express.urlencoded( { extended : true } ) );
app.use( cookieParser() );
app.use(cors({
    origin: "http://localhost:5173", // React app origin
    credentials: true
  }));

// Declearation Routes
import userRoutes from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import commentRouter from "./routes/comment.routes.js";
import playlistRouter from "./routes/playlist.routes.js"
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/videos",videoRouter);
app.use("/api/v1/likes",likeRouter);
app.use("/api/v1/subscriptions",subscriptionRouter);
app.use("/api/v1/comments",commentRouter);
app.use("/api/v1/playlists",playlistRouter);
export {app};