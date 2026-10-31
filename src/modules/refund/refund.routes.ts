import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { refundController } from "./refund.controller";

const router = Router();

router.use(authMiddleware(["merchant"]));

router.post("/", refundController.createRefund);
router.get("/", refundController.listMerchantRefunds);
router.get("/:refundId", refundController.getMerchantRefund);

export default router;