// Firma y verificación del QR: no necesita base de datos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSigningKeys, keysFromBase64, signTicketCode, verifyTicketCode } from "../src/qr.mjs";

const keys = keysFromBase64(generateSigningKeys());
const id = "3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d";

test("un código firmado se verifica y devuelve el id", () => {
  const code = signTicketCode(keys, id);
  assert.match(code, /^NO1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{86}$/);
  assert.equal(verifyTicketCode(keys, code), id);
});

test("un código modificado o de otra clave no pasa", () => {
  const code = signTicketCode(keys, id);
  const [prefix, idPart, sig] = code.split(".");
  const otherId = signTicketCode(keys, "00000000-0000-4000-8000-000000000001").split(".")[1];
  assert.equal(verifyTicketCode(keys, `${prefix}.${otherId}.${sig}`), null);
  const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
  assert.equal(verifyTicketCode(keys, `${prefix}.${idPart}.${flipped}`), null);
  assert.equal(verifyTicketCode(keysFromBase64(generateSigningKeys()), code), null);
});

test("basura no rompe nada", () => {
  for (const junk of ["", "hola", "NO1..", "NO2.a.b", null, undefined, "https://ejemplo.com"]) {
    assert.equal(verifyTicketCode(keys, junk), null);
  }
});

test("con solo la clave pública se verifica pero no se firma", () => {
  const pair = generateSigningKeys();
  const full = keysFromBase64(pair);
  const publicOnly = keysFromBase64({ publicKey: pair.publicKey });
  assert.equal(verifyTicketCode(publicOnly, signTicketCode(full, id)), id);
  assert.throws(() => signTicketCode(publicOnly, id));
});
