import { generateId } from "../../common/utils/id-generator";

export type MockGatewayChargeInput = {
  paymentOrderId: string;
  amount: number; // minor units
  currency: string;
  customerId: string;
};

export type MockGatewayChargeResult = {
  success: boolean;
  provider: string;
  gatewayReference: string;
  amount: number;
  failureReason?: string;
};

export const gatewayService = {
  async charge(input: MockGatewayChargeInput): Promise<MockGatewayChargeResult> {
    // Mock gateway: always success for now
    return {
      success: true,
      provider: "mock_gateway",
      gatewayReference: generateId("gw"),
      amount: input.amount
    };
  }
};