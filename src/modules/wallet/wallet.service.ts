import { AppError } from "../../common/utils/errors";
import { fromMinorUnits, toMinorUnits } from "../../common/utils/money";
import { walletRepository } from "./wallet.repository";
import { WalletTopUpInput } from "./wallet.schema";

export const walletService = {
  async getMyWallet(customerId: string) {
    const wallet = await walletRepository.findByCustomerId(customerId);

    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    return {
      id: wallet.id,
      balance: fromMinorUnits(wallet.balance),
      reservedBalance: fromMinorUnits(wallet.reservedBalance),
      currency: wallet.currency
    };
  },

  async topUpWallet(customerId: string, payload: WalletTopUpInput) {
    const amountInMinorUnits = toMinorUnits(payload.amount);

    const result = await walletRepository.topUpWallet({
      customerId,
      amount: amountInMinorUnits
    });

    return {
      wallet: {
        id: result.wallet.id,
        balance: fromMinorUnits(result.wallet.balance),
        reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
        currency: result.wallet.currency
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: fromMinorUnits(result.transaction.amount),
        balanceAfter: fromMinorUnits(result.transaction.balanceAfter),
        reservedAfter: fromMinorUnits(result.transaction.reservedAfter),
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  },

  async getWalletTransactions(customerId: string) {
    const wallet = await walletRepository.findByCustomerId(customerId);

    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    const transactions = await walletRepository.findTransactionsByWalletId(wallet.id);

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: fromMinorUnits(tx.amount),
      balanceAfter: fromMinorUnits(tx.balanceAfter),
      reservedAfter: fromMinorUnits(tx.reservedAfter),
      reference: tx.reference,
      description: tx.description,
      createdAt: tx.createdAt
    }));
  },

  async reserveAmount(params: {
    customerId: string;
    amount: number; // major units from service caller for now
    reference?: string;
    description?: string;
  }) {
    const amountInMinorUnits = toMinorUnits(params.amount);

    const wallet = await walletRepository.findByCustomerId(params.customerId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    if (wallet.balance < amountInMinorUnits) {
      throw new AppError("Insufficient wallet balance", 400);
    }

    const result = await walletRepository.reserveAmount({
      customerId: params.customerId,
      amount: amountInMinorUnits,
      reference: params.reference,
      description: params.description
    });

    return {
      wallet: {
        id: result.wallet.id,
        balance: fromMinorUnits(result.wallet.balance),
        reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
        currency: result.wallet.currency
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: fromMinorUnits(result.transaction.amount),
        balanceAfter: fromMinorUnits(result.transaction.balanceAfter),
        reservedAfter: fromMinorUnits(result.transaction.reservedAfter),
        reference: result.transaction.reference,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  },

  async releaseReservedAmount(params: {
    customerId: string;
    amount: number; // major units from service caller for now
    reference?: string;
    description?: string;
  }) {
    const amountInMinorUnits = toMinorUnits(params.amount);

    const wallet = await walletRepository.findByCustomerId(params.customerId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    if (wallet.reservedBalance < amountInMinorUnits) {
      throw new AppError("Insufficient reserved wallet balance", 400);
    }

    const result = await walletRepository.releaseReservedAmount({
      customerId: params.customerId,
      amount: amountInMinorUnits,
      reference: params.reference,
      description: params.description
    });

    return {
      wallet: {
        id: result.wallet.id,
        balance: fromMinorUnits(result.wallet.balance),
        reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
        currency: result.wallet.currency
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: fromMinorUnits(result.transaction.amount),
        balanceAfter: fromMinorUnits(result.transaction.balanceAfter),
        reservedAfter: fromMinorUnits(result.transaction.reservedAfter),
        reference: result.transaction.reference,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  },

  async finalizeReservedDebit(params: {
    customerId: string;
    amount: number; // major units from service caller for now
    reference?: string;
    description?: string;
  }) {
    const amountInMinorUnits = toMinorUnits(params.amount);

    const wallet = await walletRepository.findByCustomerId(params.customerId);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    if (wallet.reservedBalance < amountInMinorUnits) {
      throw new AppError("Insufficient reserved wallet balance", 400);
    }

    const result = await walletRepository.finalizeReservedDebit({
      customerId: params.customerId,
      amount: amountInMinorUnits,
      reference: params.reference,
      description: params.description
    });

    return {
      wallet: {
        id: result.wallet.id,
        balance: fromMinorUnits(result.wallet.balance),
        reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
        currency: result.wallet.currency
      },
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: fromMinorUnits(result.transaction.amount),
        balanceAfter: fromMinorUnits(result.transaction.balanceAfter),
        reservedAfter: fromMinorUnits(result.transaction.reservedAfter),
        reference: result.transaction.reference,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt
      }
    };
  }
};