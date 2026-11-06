// Forma libre de los sectores del mapa (sin base de datos).
import test from "node:test";
import assert from "node:assert/strict";
import { parseMap } from "../src/venues.mjs";

const base = { key: "a", kind: "general", name: "Pista", x: 10, y: 10, w: 50, h: 40, capacity: 100 };

test("la forma se guarda con sus curvas y limita los valores", () => {
  const { sectors: [sector] } = parseMap({
    sectors: [{ ...base, shape: [{ x: 0, y: 0, cx: 50, cy: -30 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 9999, evil: 1 }] }],
  });
  assert.deepEqual(sector.shape, [{ x: 0, y: 0, cx: 50, cy: -30 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 300 }]);
});

test("una forma con menos de 3 puntos o demasiados se descarta", () => {
  const two = parseMap({ sectors: [{ ...base, shape: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }] }).sectors[0];
  const many = parseMap({ sectors: [{ ...base, shape: Array.from({ length: 30 }, (_, i) => ({ x: i, y: i })) }] }).sectors[0];
  const text = parseMap({ sectors: [{ ...base, shape: "M0 0" }] }).sectors[0];
  for (const sector of [two, many, text]) assert.equal(sector.shape, undefined);
});
