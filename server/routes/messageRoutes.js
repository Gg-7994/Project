import express from "express"
import { protectRoute } from "../middleware/auth.js";
import { getUsersForSidebar } from "../controllers/messageController.js";
import { getMessages, markMessaegeAsSeen, sendMessage } from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessaegeAsSeen);
messageRouter.post("/send/:id", protectRoute,sendMessage);

export default messageRouter;