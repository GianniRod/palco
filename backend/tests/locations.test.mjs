// Eventos que se venden solo por ubicación (sin plano). Sin base de datos.
import test from "node:test";
import assert from "node:assert/strict";
import { ValidationError } from "../src/auth.mjs";
import { locationsMap } from "../src/events.mjs";
import { parseMap } from "../src/venues.mjs";

test("las ubicaciones se vuelven sectores generales marcados como lista", () => {
  const map = locationsMap([
    { name: "General", capacity: "500" },
    { name: " VIP ", capacity: 60, key: "vip" },
    { name: "", capacity: 10 },
  ]);
  assert.equal(map.display, "list");
  assert.equal(map.sectors.length, 2);
  assert.deepEqual(map.sectors.map((s) => [s.kind, s.name, s.capacity]), [["general", "General", 500], ["general", "VIP", 60]]);
  assert.equal(map.sectors[1].key, "vip");
  // Vuelve a pasar por el validador del mapa sin perder la marca
  assert.equal(parseMap(map).display, "list");
});

test("ubicaciones inválidas", () => {
  assert.throws(() => locationsMap([]), ValidationError);
  assert.throws(() => locationsMap([{ name: "General", capacity: 0 }]), ValidationError);
  assert.throws(() => locationsMap([{ name: "General", capacity: 1.5 }]), ValidationError);
  assert.throws(() => locationsMap([{ name: "VIP", capacity: 5 }, { name: "vip", capacity: 5 }]), ValidationError);
  assert.throws(() => locationsMap(Array.from({ length: 21 }, (_, i) => ({ name: `U${i}`, capacity: 1 }))), ValidationError);
});

test("un mapa común no se marca como lista", () => {
  assert.equal(parseMap({ sectors: [] }).display, undefined);
  assert.equal(parseMap({ sectors: [], display: "otra" }).display, undefined);
});
