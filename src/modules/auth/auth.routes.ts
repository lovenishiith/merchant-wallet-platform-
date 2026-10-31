import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/merchant/signup", authController.merchantSignup);
router.post("/merchant/login", authController.merchantLogin);

router.post("/customer/signup", authController.customerSignup);
router.post("/customer/login", authController.customerLogin);

export default router;