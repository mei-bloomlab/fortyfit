import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOMER_PILL_PALETTE,
  customerColorIndex,
  customerColorKey,
  customerPillTone,
} from "./customer-color";

test("hash maps a customer id to a stable palette slot", () => {
  const key = customerColorKey({ id: "clxyzocean" });
  const first = customerColorIndex(key);
  const second = customerColorIndex(key);

  assert.equal(first, second);
  assert.equal(customerPillTone(key), customerPillTone(key));
  assert.ok(first >= 0 && first < CUSTOMER_PILL_PALETTE.length);
  assert.ok(CUSTOMER_PILL_PALETTE.length >= 6 && CUSTOMER_PILL_PALETTE.length <= 8);
});

test("customer id wins over name, and different ids may collide", () => {
  assert.equal(customerColorKey({ id: "abc", name: "Ocean" }), "id:abc");
  assert.equal(customerColorKey({ name: "Ocean" }), "name:Ocean");

  const indexes = ["id:one", "id:two", "id:three"].map(customerColorIndex);
  assert.ok(indexes.every((index) => index >= 0 && index < CUSTOMER_PILL_PALETTE.length));
});
