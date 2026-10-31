import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 3,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200"]
  }
};

const BASE_URL = "http://localhost:4000";

function randomEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.com`;
}

export default function () {
  // 1) merchant signup
  const merchantSignupRes = http.post(
    `${BASE_URL}/api/auth/merchant/signup`,
    JSON.stringify({
      businessName: "k6 Merchant",
      email: randomEmail("k6-merchant"),
      password: "Password123"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  check(merchantSignupRes, {
    "merchant signup status is 201": (r) => r.status === 201
  });

  const merchantToken = merchantSignupRes.json()?.data?.accessToken;

  check(merchantToken, {
    "merchant token exists": (t) => !!t
  });

  if (!merchantToken) {
    return;
  }

  // 2) customer signup
  const customerSignupRes = http.post(
    `${BASE_URL}/api/auth/customer/signup`,
    JSON.stringify({
      fullName: "k6 Customer",
      email: randomEmail("k6-customer"),
      password: "Password123"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  check(customerSignupRes, {
    "customer signup status is 201": (r) => r.status === 201
  });

  const customerBody = customerSignupRes.json();
  const customerToken = customerBody?.data?.accessToken;
  const customerId = customerBody?.data?.customer?.id;

  check(customerToken, {
    "customer token exists": (t) => !!t
  });

  check(customerId, {
    "customer id exists": (id) => !!id
  });

  if (!customerToken || !customerId) {
    return;
  }

  // 3) merchant creates payment order
  const createOrderRes = http.post(
    `${BASE_URL}/api/payment-orders`,
    JSON.stringify({
      customerId,
      amount: 200,
      description: "k6 payment flow test"
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${merchantToken}`
      }
    }
  );

  check(createOrderRes, {
    "create payment order status is 201": (r) => r.status === 201
  });

  const orderId = createOrderRes.json()?.data?.id;

  check(orderId, {
    "payment order id exists": (id) => !!id
  });

  if (!orderId) {
    return;
  }

  // 4) customer pays order
  const payRes = http.post(
    `${BASE_URL}/api/payment-orders/customer/${orderId}/pay`,
    JSON.stringify({
      mode: "GATEWAY"
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
        "Idempotency-Key": `k6-pay-${__VU}-${__ITER}-${Date.now()}`
      }
    }
  );

  check(payRes, {
    "pay order status is 200": (r) => r.status === 200,
    "payment order becomes PAID": (r) =>
      r.status === 200 && r.json()?.data?.paymentOrder?.status === "PAID"
  });

  sleep(1);
}