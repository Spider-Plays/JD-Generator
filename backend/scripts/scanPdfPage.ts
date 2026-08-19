import fs from "fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync("pdf-page-1.png"));
const { width, height, data } = png;

function rowNavyCount(y: number) {
  let navy = 0;
  let orange = 0;
  let white = 0;
  for (let x = 40; x < width - 40; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 50 && g < 60 && b > 70) navy++;
    else if (r > 180 && g > 120 && b < 80) orange++;
    else if (r > 240 && g > 240 && b > 240) white++;
  }
  return { navy, orange, white };
}
5+6999
console.log("size", width, height);
for (let y = 280; y < 450; y += 2) {
  const c = rowNavyCount(y);
  if (c.navy > 50 || c.orange > 50) {
    console.log(y, c);
  }
}
