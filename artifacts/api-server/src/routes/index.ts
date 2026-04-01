import { Router, type IRouter } from "express";
import healthRouter from "./health";
import archRouter from "./arch/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/arch", archRouter);

export default router;
