import { Router, type IRouter } from "express";
import healthRouter from "./health";
import extractRouter from "./extract";
import casesRouter from "./cases";

const router: IRouter = Router();

router.use(healthRouter);
router.use(extractRouter);
router.use(casesRouter);

export default router;
