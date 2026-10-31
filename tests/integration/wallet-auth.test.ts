import request from "supertest";
import app from "../../src/app";

describe("Wallet + Auth guard integration", () => {
  let merchantToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const merchantSignupRes = await request(app)
      .post("/api/auth/merchant/signup")
      .send({
        businessName: "Wallet Test Merchant",
        email: "wallet-merchant@test.com",
        password: "Password123"
      });

    merchantToken = merchantSignupRes.body.data.accessToken;

    const customerSignupRes = await request(app)
      .post("/api/auth/customer/signup")
      .send({
        fullName: "Wallet Test Customer",
        email: "wallet-customer@test.com",
        password: "Password123"
      });

    customerToken = customerSignupRes.body.data.accessToken;
  });

  it("customer can fetch wallet", async () => {
    const res = await request(app)
      .get("/api/wallet/me")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.reservedBalance).toBe(0);
    expect(res.body.data.currency).toBe("INR");
  });

  it("customer can top up wallet and then see transaction history", async () => {
    const topUpRes = await request(app)
      .post("/api/wallet/top-up")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        amount: 500
      });

    expect(topUpRes.status).toBe(200);
    expect(topUpRes.body.success).toBe(true);
    expect(topUpRes.body.data.wallet.balance).toBe(500);
    expect(topUpRes.body.data.wallet.currency).toBe("INR");

    const walletRes = await request(app)
      .get("/api/wallet/me")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body.data.balance).toBe(500);

    const txRes = await request(app)
      .get("/api/wallet/transactions")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(txRes.status).toBe(200);
    expect(txRes.body.success).toBe(true);
    expect(Array.isArray(txRes.body.data)).toBe(true);
    expect(txRes.body.data.length).toBeGreaterThan(0);
    expect(txRes.body.data[0].type).toBe("TOP_UP");
    expect(txRes.body.data[0].amount).toBe(500);
  });

  it("returns 401 when protected wallet route is called without token", async () => {
    const res = await request(app).get("/api/wallet/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 403 when merchant tries to access customer wallet route", async () => {
    const res = await request(app)
      .get("/api/wallet/me")
      .set("Authorization", `Bearer ${merchantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});