import { LedgerEntry, Prisma, Wallet, WalletTransaction } from "@prisma/client";
import { prisma } from "../../config/db";

type WalletMutationResult = {
  wallet: Wallet;
  transaction: WalletTransaction;
  ledgerEntry: LedgerEntry;
};

export const walletRepository = {
  create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    return prisma.wallet.create({ data });
  },

  findByCustomerId(customerId: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { customerId }
    });
  },

  findTransactionsByWalletId(walletId: string): Promise<WalletTransaction[]> {
    return prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" }
    });
  },

  async topUpWallet(params: {
    customerId: string;
    amount: number; // minor units
  }): Promise<WalletMutationResult> {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: params.customerId }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: params.amount
          }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "TOP_UP",
          amount: params.amount,
          balanceAfter: updatedWallet.balance,
          reservedAfter: updatedWallet.reservedBalance,
          description: "Wallet top-up"
        }
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WALLET_TOP_UP",
          amount: params.amount,
          description: "Wallet top-up"
        }
      });

      return {
        wallet: updatedWallet,
        transaction,
        ledgerEntry
      };
    });
  },

  async reserveAmount(params: {
    customerId: string;
    amount: number; // minor units
    reference?: string;
    description?: string;
  }): Promise<WalletMutationResult> {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: params.customerId }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < params.amount) {
      throw new Error("Insufficient wallet balance");
    }

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: params.amount
          },
          reservedBalance: {
            increment: params.amount
          }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "RESERVE",
          amount: params.amount,
          balanceAfter: updatedWallet.balance,
          reservedAfter: updatedWallet.reservedBalance,
          reference: params.reference,
          description: params.description ?? "Wallet amount reserved"
        }
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WALLET_RESERVE",
          amount: params.amount,
          description: params.description ?? "Wallet amount reserved"
        }
      });

      return {
        wallet: updatedWallet,
        transaction,
        ledgerEntry
      };
    });
  },

  async releaseReservedAmount(params: {
    customerId: string;
    amount: number; // minor units
    reference?: string;
    description?: string;
  }): Promise<WalletMutationResult> {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: params.customerId }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.reservedBalance < params.amount) {
      throw new Error("Insufficient reserved wallet balance");
    }

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: {
            decrement: params.amount
          },
          balance: {
            increment: params.amount
          }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "RELEASE",
          amount: params.amount,
          balanceAfter: updatedWallet.balance,
          reservedAfter: updatedWallet.reservedBalance,
          reference: params.reference,
          description: params.description ?? "Reserved wallet amount released"
        }
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WALLET_RELEASE",
          amount: params.amount,
          description: params.description ?? "Reserved wallet amount released"
        }
      });

      return {
        wallet: updatedWallet,
        transaction,
        ledgerEntry
      };
    });
  },

  async finalizeReservedDebit(params: {
    customerId: string;
    amount: number; // minor units
    reference?: string;
    description?: string;
  }): Promise<WalletMutationResult> {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: params.customerId }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.reservedBalance < params.amount) {
      throw new Error("Insufficient reserved wallet balance");
    }

    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: {
            decrement: params.amount
          }
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          amount: params.amount,
          balanceAfter: updatedWallet.balance,
          reservedAfter: updatedWallet.reservedBalance,
          reference: params.reference,
          description: params.description ?? "Reserved wallet amount debited"
        }
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WALLET_DEBIT",
          amount: params.amount,
          description: params.description ?? "Reserved wallet amount debited"
        }
      });

      return {
        wallet: updatedWallet,
        transaction,
        ledgerEntry
      };
    });
  }
};