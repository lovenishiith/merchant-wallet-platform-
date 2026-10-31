import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import walletRoutes from "../modules/wallet/wallet.routes";
import paymentRoutes from "../modules/payment/payment.routes";
import refundRoutes from "../modules/refund/refund.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/wallet", walletRoutes);
router.use("/payment-orders", paymentRoutes);
router.use("/refunds", refundRoutes);

export default router;