import QRCode from "qrcode";
import { OWL_MARK } from "./owl-mark";

// QR de Nightowl: módulos y ojos con esquinas redondeadas y el búho en el medio.
// Usa corrección de errores alta (H, ~30%): el búho tapa ~5% del código, así que se sigue leyendo sin problema.

const QUIET = 3; // margen blanco alrededor, en módulos
// Cada módulo es un cuadradito con trazo de esquinas redondas: queda redondeado y el SVG pesa poco.
const DOT_RADIUS = 0.38; // redondeo de cada módulo (0 = cuadrado, 0.5 = círculo)
const DOT_CORE = +(1 - 2 * DOT_RADIUS).toFixed(2);
const INK = "#050505";

function roundedSquare(x: number, y: number, size: number, r: number) {
  const s = size - 2 * r;
  return `M${x + r} ${y}h${s}a${r} ${r} 0 0 1 ${r} ${r}v${s}a${r} ${r} 0 0 1 ${-r} ${r}h${-s}a${r} ${r} 0 0 1 ${-r} ${-r}v${-s}a${r} ${r} 0 0 1 ${r} ${-r}z`;
}

export function brandedQrSvg(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const dark = (row: number, col: number) => qr.modules.data[row * n + col] === 1;

  // Zonas que dibujamos aparte: los tres ojos (7×7) y el cuadro del búho en el centro.
  const inFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7);
  let logo = Math.round(n * 0.22);
  if (logo % 2 !== n % 2) logo += 1; // mismo tipo de paridad para que quede centrado justo
  const logoStart = (n - logo) / 2;
  const inLogo = (row: number, col: number) =>
    row >= logoStart && row < logoStart + logo && col >= logoStart && col < logoStart + logo;

  let dots = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!dark(row, col) || inFinder(row, col) || inLogo(row, col)) continue;
      dots += `M${+(col + QUIET + DOT_RADIUS).toFixed(2)} ${+(row + QUIET + DOT_RADIUS).toFixed(2)}h${DOT_CORE}v${DOT_CORE}h-${DOT_CORE}z`;
    }
  }

  // Ojos: anillo 7×7 redondeado y centro 3×3 redondeado.
  let eyes = "";
  for (const [x, y] of [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]) {
    const ox = x + QUIET;
    const oy = y + QUIET;
    eyes += roundedSquare(ox, oy, 7, 2.2) + roundedSquare(ox + 1, oy + 1, 5, 1.5);
    eyes += roundedSquare(ox + 2, oy + 2, 3, 1);
  }

  // Búho centrado dentro del cuadro libre, con un poco de aire.
  const box = logo - 1;
  const boxXY = logoStart + QUIET + 0.5;
  const owlH = box * 0.9;
  const owlW = (owlH * OWL_MARK.width) / OWL_MARK.height;
  const owlX = boxXY + (box - owlW) / 2;
  const owlY = boxXY + (box - owlH) / 2;

  const total = n + QUIET * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="Código QR de la entrada">` +
    `<rect width="${total}" height="${total}" rx="${QUIET}" fill="#fff"/>` +
    `<path d="${dots}" fill="${INK}" stroke="${INK}" stroke-width="${DOT_RADIUS * 2}" stroke-linejoin="round"/>` +
    `<path d="${eyes}" fill="${INK}" fill-rule="evenodd"/>` +
    `<image href="${OWL_MARK.dataUrl}" x="${owlX}" y="${owlY}" width="${owlW}" height="${owlH}"/>` +
    `</svg>`
  );
}
