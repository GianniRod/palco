import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isMercadoPagoOrderId, isValidWebhookSignature, mercadoPagoOrderBody, usesMercadoPagoOrders } from "../src/mercadopago.mjs";

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

test("las orders se firman con el id en minúsculas", () => {
  const v1 = sign("id:ord01jq4s4ky8hwq6na5pxb65b3d3;request-id:abc-1;ts:1742505638683;");
  assert.equal(
    isValidWebhookSignature({ xSignature: `ts=1742505638683,v1=${v1}`, xRequestId: "abc-1", dataId: "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3", secret }),
    true,
  );
});

test("reconoce ids de order de Mercado Pago (también los de prueba)", () => {
  assert.equal(isMercadoPagoOrderId("ORDTST01M6T3MEGR6A4Z8P5SE4H2G117"), true);
  assert.equal(isMercadoPagoOrderId("ORD01JQ4S4KY8HWQ6NA5PXB65B3D3"), true);
  assert.equal(isMercadoPagoOrderId("123456"), false);
  assert.equal(isMercadoPagoOrderId("ORD/../payments"), false);
  assert.equal(isMercadoPagoOrderId(null), false);
});

test("Orders API solo con MP_ORDERS=true", () => {
  assert.equal(usesMercadoPagoOrders({ MP_ORDERS: "true" }), true);
  assert.equal(usesMercadoPagoOrders({}), false);
  assert.equal(usesMercadoPagoOrders({ MP_ORDERS: "1" }), false);
});

const pending = {
  id: "8f6c1f0e-3d2b-4a59-9a3e-2f1c0b7d6e5a",
  token: "tok en",
  title: "Noche de Prueba",
  venue: "Moscú",
  startsAt: "2026-11-14T03:00:00.000Z",
  expiresAt: "2026-11-07T05:10:00.000Z",
  amountDue: 21600,
  buyerName: "Juana  María Pérez",
  buyerEmail: "juana@example.com",
  items: [{ sector: "Pista" }, { sector: "Platea", row: "D", number: 6 }],
};

test("la order lleva lo que pide el checklist de calidad", () => {
  const body = mercadoPagoOrderBody(pending, { siteUrl: "https://moscu.nightowl.com.ar", siteName: "Moscú Bs. As." }, Date.parse("2026-11-07T05:00:00.000Z"));
  assert.equal(body.type, "online");
  assert.equal(body.processing_mode, "manual");
  assert.notEqual(body.capture_mode, "automatic");
  assert.equal(body.total_amount, "21600.00");
  assert.equal(body.items[0].unit_price, "21600.00");
  assert.equal(body.items[0].quantity, 1);
  assert.equal(body.items[0].category_id, "tickets");
  assert.equal(body.items[0].event_date, "2026-11-14T03:00:00.000Z");
  assert.equal(body.items[0].description, "Noche de Prueba · Moscú · Pista, Platea D6");
  assert.equal(body.external_reference, pending.id);
  assert.equal(body.expiration_time, "PT600S");
  assert.deepEqual(body.payer, { email: "juana@example.com", first_name: "Juana", last_name: "María Pérez" });
  assert.equal(body.config.statement_descriptor, "Mosc Bs As");
  const back = "https://moscu.nightowl.com.ar/api/mercadopago/vuelta?token=tok%20en";
  assert.equal(body.config.online.success_url, back);
  assert.equal(body.config.online.failure_url, back);
  assert.equal(body.config.online.auto_return, "approved");
  assert.deepEqual(body.config.online.transaction_security, { validation: "on_fraud_risk", liability_shift: "required" });
  assert.deepEqual(body.config.payment_method.not_allowed_types, ["ticket", "atm"]);
});

test("sin https no hay auto_return, y la order vence en no menos de un minuto", () => {
  const body = mercadoPagoOrderBody({ ...pending, buyerName: "" }, { siteUrl: "http://localhost:3000", siteName: "" }, Date.parse("2026-11-07T06:00:00.000Z"));
  assert.equal(body.config.online.auto_return, undefined);
  assert.equal(body.expiration_time, "PT60S");
  assert.equal(body.config.statement_descriptor, "NIGHTOWL");
  assert.deepEqual(body.payer, { email: "juana@example.com" });
});
