import { prisma } from "../../config/db";
import { AppError } from "../../common/utils/errors";
import {
  comparePassword,
  hashPassword,
  signAccessToken
} from "../../common/utils/crypto";
import { merchantRepository } from "../merchant/merchant.repository";
import { customerRepository } from "../customer/customer.repository";
import {
  CustomerLoginInput,
  CustomerSignupInput,
  MerchantLoginInput,
  MerchantSignupInput
} from "./auth.schema";

export const authService = {
  async merchantSignup(payload: MerchantSignupInput) {
    const existingMerchant = await merchantRepository.findByEmail(payload.email);

    if (existingMerchant) {
      throw new AppError("Merchant with this email already exists", 409);
    }

    const passwordHash = await hashPassword(payload.password);

    const merchant = await merchantRepository.create({
      businessName: payload.businessName,
      email: payload.email,
      passwordHash
    });

    const accessToken = signAccessToken({
      userId: merchant.id,
      role: "merchant"
    });

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        email: merchant.email,
        status: merchant.status
      }
    };
  },

  async merchantLogin(payload: MerchantLoginInput) {
    const merchant = await merchantRepository.findByEmail(payload.email);

    if (!merchant) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      merchant.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = signAccessToken({
      userId: merchant.id,
      role: "merchant"
    });

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        email: merchant.email,
        status: merchant.status
      }
    };
  },

  async customerSignup(payload: CustomerSignupInput) {
    const existingCustomer = await customerRepository.findByEmail(payload.email);

    if (existingCustomer) {
      throw new AppError("Customer with this email already exists", 409);
    }

    const passwordHash = await hashPassword(payload.password);

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          fullName: payload.fullName,
          email: payload.email,
          passwordHash
        }
      });

      const wallet = await tx.wallet.create({
        data: {
          customerId: customer.id,
          balance: 0,
          reservedBalance: 0,
          currency: "INR"
        }
      });

      return { customer, wallet };
    });

    const accessToken = signAccessToken({
      userId: result.customer.id,
      role: "customer"
    });

    return {
      accessToken,
      customer: {
        id: result.customer.id,
        fullName: result.customer.fullName,
        email: result.customer.email,
        status: result.customer.status
      },
      wallet: {
        id: result.wallet.id,
        balance: result.wallet.balance,
        reservedBalance: result.wallet.reservedBalance,
        currency: result.wallet.currency
      }
    };
  },

  async customerLogin(payload: CustomerLoginInput) {
    const customer = await customerRepository.findByEmail(payload.email);

    if (!customer) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      customer.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = signAccessToken({
      userId: customer.id,
      role: "customer"
    });

    return {
      accessToken,
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        status: customer.status
      }
    };
  }
};