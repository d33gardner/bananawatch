/**
 * Copies banana images per patient (20260214-001..028) from raw_photos
 * into web/public/patients/ and mobile/assets/patients/.
 * - One image per day: 20260214-001-Day01.jpg … 20260214-001-Day07.jpg (flat layout).
 * - Single avatar for grid: 20260214-001.jpg (prefers Day01, else first day available).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "raw_photos");
const WEB_PATIENTS = path.join(ROOT, "web", "public", "patients");
const MOBILE_PATIENTS = path.join(ROOT, "mobile", "assets", "patients");

[WEB_PATIENTS, MOBILE_PATIENTS].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const files = fs.readdirSync(RAW);

for (let n = 1; n <= 28; n++) {
  const id = `20260214-${String(n).padStart(3, "0")}`;
  const prefix = id + "_";
  const matches = files
    .filter((f) => f.startsWith(prefix) && /\.(jpg|jpeg|png)$/i.test(f))
    .sort((a, b) => {
      const dayA = (a.match(/_Day(\d+)_/) || [])[1] || "99";
      const dayB = (b.match(/_Day(\d+)_/) || [])[1] || "99";
      return parseInt(dayA, 10) - parseInt(dayB, 10) || a.localeCompare(b);
    });

  // Group by day (Day01 .. Day07), take first file per day
  const byDay = new Map();
  for (const f of matches) {
    const dayMatch = f.match(/_Day(\d+)_/);
    const day = dayMatch ? dayMatch[1] : null;
    if (day && !byDay.has(day)) byDay.set(day, f);
  }

  const ext = (f) => (path.extname(f).toLowerCase() === ".jpeg" ? ".jpg" : path.extname(f).toLowerCase());

  // Copy per-day files: 20260214-001-Day01.jpg … -Day07.jpg
  for (const [day, src] of byDay) {
    const destName = `${id}-Day${day}${ext(src)}`;
    const srcPath = path.join(RAW, src);
    for (const dir of [WEB_PATIENTS, MOBILE_PATIENTS]) {
      fs.copyFileSync(srcPath, path.join(dir, destName));
    }
    console.log(`${id} Day${day} <- ${src}`);
  }

  // Single avatar for grid: prefer Day01, else first available
  const day01 = byDay.get("01");
  const firstFile = day01 || (byDay.values().next().value);
  if (firstFile) {
    const destName = id + ext(firstFile);
    const srcPath = path.join(RAW, firstFile);
    for (const dir of [WEB_PATIENTS, MOBILE_PATIENTS]) {
      fs.copyFileSync(srcPath, path.join(dir, destName));
    }
    console.log(`${id} (avatar) <- ${firstFile}`);
  }
}
console.log("Done.");
