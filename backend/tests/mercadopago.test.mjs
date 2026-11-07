import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isValidWebhookSignature } from "../src/mercadopago.mjs";

const secret = "clave-de-prueba";
const sign = (manifest) => createHmac("sha256", secret).update(manifest).digest("hex");

test("acepta la firma armada como el SDK oficial", () => {
  const v1 = sign("id:123456;request-id:abc-1;ts:1704908010;");
  assert.equal(
    isValidWebhookSignature({ xSignature: `ts=1704908010,v1=${v1}`, xRequestId: "abc-1", dataId: "123456", secret }),
    true,
  );
});

test("sin x-request-id, la parte se omite del texto firmado", () => {
  const v1 = sign("id:123456;ts:1704908010;");
  assert.equal(isValidWebhookSignature({ xSignature: `ts=1704908010,v1=${v1}`, dataId: "123456", secret }), true);
});

test("rechaza otro pago, otra clave, o el header roto", () => {
  const v1 = sign("id:123456;request-id:abc-1;ts:1704908010;");
  const header = `ts=1704908010,v1=${v1}`;
  assert.equal(isValidWebhookSignature({ xSignature: header, xRequestId: "abc-1", dataId: "999", secret }), false);
  assert.equal(isValidWebhookSignature({ xSignature: header, xRequestId: "abc-1", dataId: "123456", secret: "otra" }), false);
  assert.equal(isValidWebhookSignature({ xSignature: "v1=algo", xRequestId: "abc-1", dataId: "123456", secret }), false);
  assert.equal(isValidWebhookSignature({ xSignature: null, dataId: "123456", secret }), false);
  assert.equal(isValidWebhookSignature({ xSignature: header, dataId: "123456", secret: undefined }), false);
});
