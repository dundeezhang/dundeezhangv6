import { readFileSync, writeFileSync } from "node:fs";
import { interpolate } from "flubber";

type Point = [number, number];
type Contours = { outer: Point[][]; holes: Point[][] };
const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
const sourceXScale = (source.font.inkBounds[3] / source.height) / (source.font.inkBounds[2] / source.width);

function tiny(ring: Point[]): Point[] {
  const x = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const y = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  return [[x - 0.001, y], [x, y - 0.001], [x + 0.001, y], [x, y + 0.001]];
}

function curve(points: Point[]) {
  const n = points.length;
  const number = (value: number) => +value.toFixed(2);
  const midpoint = (a: Point, b: Point) => `${number((a[0] + b[0]) / 2)} ${number((a[1] + b[1]) / 2)}`;
  return `M${midpoint(points[n - 1], points[0])}${points.map((point, i) => `Q${number(point[0])} ${number(point[1])} ${midpoint(point, points[(i + 1) % n])}`).join("")}Z`;
}

const standalone: string[] = [];
const letters = source.letters.map((letter: { name: string; from: Contours; to: Contours }) => {
  const sourceLeft = Math.min(...letter.from.outer.flat().map(point => point[0])) * sourceXScale;
  const targetLeft = Math.min(...letter.to.outer.flat().map(point => point[0]));
  const shift = targetLeft - sourceLeft;
  const starts: string[] = [];
  const ends: string[] = [];
  const original: string[] = [];
  let stem: string | undefined;
  for (const kind of ["outer", "holes"] as const) {
    const from = letter.from[kind];
    const to = letter.to[kind];
    for (let i = 0; i < Math.max(from.length, to.length); i++) {
      const a = (from[i] || tiny(from[0] || letter.from.outer[0])).map(([x, y]) => [x * sourceXScale, y] as Point);
      const b = to[i] || tiny(to[0] || letter.to.outer[0]);
      const mix = interpolate(a, b, { string: false, maxSegmentLength: 5 });
      const first = mix(0.000000001) as unknown as Point[];
      const last = mix(0.999999999) as unknown as Point[];
      if (kind === "holes") { first.reverse(); last.reverse(); }
      starts.push(curve(first));
      if (letter.name === "D" && kind === "outer" && i === 1) stem = curve(first);
      // Morph at the handwriting's current anchor; preceding letters supply
      // the horizontal space through a separate, cumulative layout shift.
      ends.push(curve(last.map(([x, y]) => [x - shift, y])));
      original.push(curve(first.map(([x, y]) => [x / sourceXScale, y])));
    }
  }
  standalone.push(original.join(""));
  return { name: letter.name, shift: +shift.toFixed(3), from: starts.join(""), to: ends.join(""), ...(stem ? { stem } : {}) };
});

const data = { width: source.width, height: source.height, sourceXScale, font: source.font, letters };
writeFileSync("src/data/signature-animation.json", JSON.stringify(data));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${source.width} ${source.height}" width="${source.width}" height="${source.height}" role="img" aria-labelledby="signature-title"><title id="signature-title">Dundee Zhang signature</title><g fill="currentColor">${standalone.map(path => `<path d="${path}"/>`).join("")}</g></svg>\n`;
writeFileSync("public/images/signature.svg", svg);
console.log(`Built smooth SVG and ${letters.length} matched letter morphs.`);
