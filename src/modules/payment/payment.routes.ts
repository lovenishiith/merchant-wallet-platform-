import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { paymentController } from "./payment.controller";

const router = Router();

/**
 * Merchant routes
 */
router.post("/", authMiddleware(["merchant"]), paymentController.createPaymentOrder);
router.get("/", authMiddleware(["merchant"]), paymentController.listMerchantPaymentOrders);
router.get("/:orderId", authMiddleware(["merchant"]), paymentController.getMerchantPaymentOrder);

/**
 * Customer routes
 */
router.get(
  "/customer/:orderId",
  authMiddleware(["customer"]),
  paymentController.getCustomerPaymentOrder
);

router.post(
  "/customer/:orderId/pay",
  authMiddleware(["customer"]),
  paymentController.payOrder
);

export default router;