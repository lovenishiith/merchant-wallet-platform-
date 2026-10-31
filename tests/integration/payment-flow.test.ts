import request from "supertest";
import app from "../../src/app";

describe("Payment + Refund integration", () => {
  let merchantToken: string;
  let customerToken: string;
  let customerId: string;

  beforeEach(async () => {
    const merchantSignupRes = await request(app)
      .post("/api/auth/merchant/signup")
      .send({
        businessName: "Test Merchant",
        email: "merchant@test.com",
        password: "Password123"
      });

    merchantToken = merchantSignupRes.body.data.accessToken;

    const customerSignupRes = await request(app)
      .post("/api/auth/customer/signup")
      .send({
        fullName: "Test Customer",
        email: "customer@test.com",
        password: "Password123"
      });

    customerToken = customerSignupRes.body.data.accessToken;
    customerId = customerSignupRes.body.data.customer.id;
  });

  async function createOrder(amount: number, description = "Test order") {
    const res = await request(app)
      .post("/api/payment-orders")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({
        customerId,
        amount,
        description
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    return res.body.data.id as string;
  }

  async function payOrder(
    orderId: string,
    mode: "WALLET" | "GATEWAY" | "AUTO",
    idempotencyKey: string
  ) {
    return request(app)
      .post(`/api/payment-orders/customer/${orderId}/pay`)
      .set("Authorization", `Bearer ${customerToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ mode });
  }

  async function createRefund(
    paymentOrderId: string,
    amount: number,
    idempotencyKey: string,
    reason = "Test refund"
  ) {
    return request(app)
      .post("/api/refunds")
      .set("Authorization", `Bearer ${merchantToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        paymentOrderId,
        amount,
        reason
      });
  }

  it("merchant creates an order and customer pays it via gateway", async () => {
    const orderId = await createOrder(250, "Gateway payment test");

    const payRes = await payOrder(orderId, "GATEWAY", "test-pay-1");

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.paymentOrder.status).toBe("PAID");
    expect(payRes.body.data.paymentAttempt.method).toBe("GATEWAY");
  });

  it("returns the same response for duplicate payment request with same idempotency key", async () => {
    const orderId = await createOrder(200, "Payment idempotency");

    const firstPayRes = await payOrder(orderId, "GATEWAY", "pay-idem-1");
    const secondPayRes = await payOrder(orderId, "GATEWAY", "pay-idem-1");

    expect(firstPayRes.status).toBe(200);
    expect(secondPayRes.status).toBe(200);

    expect(secondPayRes.body).toEqual(firstPayRes.body);
  });

  it("rejects payment request when same idempotency key is reused with different payload", async () => {
    const orderId = await createOrder(220, "Payment idempotency conflict");

    const firstPayRes = await payOrder(orderId, "GATEWAY", "pay-idem-2");
    expect(firstPayRes.status).toBe(200);

    const secondPayRes = await payOrder(orderId, "AUTO", "pay-idem-2");

    expect(secondPayRes.status).toBe(409);
    expect(secondPayRes.body.success).toBe(false);
  });

  it("creates refund for paid order", async () => {
    const orderId = await createOrder(300, "Refund success test");

    const payRes = await payOrder(orderId, "GATEWAY", "pay-refund-1");
    expect(payRes.status).toBe(200);

    const refundRes = await createRefund(orderId, 100, "refund-idem-1");

    expect(refundRes.status).toBe(201);
    expect(refundRes.body.success).toBe(true);
    expect(refundRes.body.data.refund.amount).toBe(100);
  });

  it("returns the same response for duplicate refund request with same idempotency key", async () => {
    const orderId = await createOrder(320, "Refund idempotency");

    const payRes = await payOrder(orderId, "GATEWAY", "pay-refund-2");
    expect(payRes.status).toBe(200);

    const firstRefundRes = await createRefund(orderId, 120, "refund-idem-2");
    const secondRefundRes = await createRefund(orderId, 120, "refund-idem-2");

    expect(firstRefundRes.status).toBe(201);
    expect(secondRefundRes.status).toBe(201);

    expect(secondRefundRes.body).toEqual(firstRefundRes.body);
  });

  it("rejects refund request when same idempotency key is reused with different payload", async () => {
    const orderId = await createOrder(350, "Refund idempotency conflict");

    const payRes = await payOrder(orderId, "GATEWAY", "pay-refund-3");
    expect(payRes.status).toBe(200);

    const firstRefundRes = await createRefund(orderId, 100, "refund-idem-3");
    expect(firstRefundRes.status).toBe(201);

    const secondRefundRes = await createRefund(orderId, 80, "refund-idem-3");

    expect(secondRefundRes.status).toBe(409);
    expect(secondRefundRes.body.success).toBe(false);
  });
});