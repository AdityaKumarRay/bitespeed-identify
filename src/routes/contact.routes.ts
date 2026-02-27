import { Router } from "express";
import { identifyController } from "../controllers/contact.controller";

export const contactRouter = Router();

contactRouter.post("/identify", identifyController);
