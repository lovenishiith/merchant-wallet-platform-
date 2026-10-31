import { Router } from "express";
import { walletController } from "./wallet.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware(["customer"]));

router.get("/me", walletController.getMyWallet);
router.post("/top-up", walletController.topUpWallet);
router.get("/transactions", walletController.getWalletTransactions);

router.post("/debug/reserve", walletController.reserveAmount);
router.post("/debug/release", walletController.releaseReservedAmount);
router.post("/debug/finalize", walletController.finalizeReservedDebit);

export default router;