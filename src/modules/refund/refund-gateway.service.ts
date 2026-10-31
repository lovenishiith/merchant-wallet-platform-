import { generateId } from "../../common/utils/id-generator";

export type MockGatewayRefundInput = {
  paymentOrderId: string;
  refundId?: string;
  amount: number; // minor units
  currency: string;
  customerId: string;
};

export type MockGatewayRefundResult = {
  success: boolean;
  provider: string;
  gatewayRefundReference: string;
  amount: number;
  failureReason?: string;
};

export const refundGatewayService = {
  async refund(input: MockGatewayRefundInput): Promise<MockGatewayRefundResult> {
    return {
      success: true,
      provider: "mock_gateway",
      gatewayRefundReference: generateId("gw_ref"),
      amount: input.amount
    };
  }
};