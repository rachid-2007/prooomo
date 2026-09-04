import { writeFileSync } from "fs";

const entries: Record<string, string> = {};

async function fetchCities(stateId: number) {
  try {
    const res = await fetch(`https://files.hanotify.store/others/get-cities?state_id=${stateId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function main() {
  console.log("Fetching cities for all 58 states...");

  for (let stateId = 1; stateId <= 58; stateId++) {
    const cities = await fetchCities(stateId);
    for (const city of cities) {
      const nameAr = city.name_ar || "";
      const nameFr = city.name || "";
      const communeAr = nameAr.includes(" - ") ? nameAr.split(" - ").slice(1).join(" - ") : nameAr;
      const communeFr = nameFr.includes(" - ") ? nameFr.split(" - ").slice(1).join(" - ") : nameFr;

      if (communeFr && communeAr && !entries[communeFr]) {
        entries[communeFr] = communeAr;
      }
    }
    process.stdout.write(`  ${stateId}/58\r`);
  }

  const sorted = Object.entries(entries).sort((a, b) => a[0].localeCompare(b[0]));

  const lines = [
    "export const BALADYA_ARABIC: Record<string, string> = {",
    ...sorted.map(([k, v]) => `  "${k.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}": "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`),
    "};",
  ];

  writeFileSync("src/lib/baladya-arabic.ts", lines.join("\n") + "\n");
  console.log(`\nDone! Wrote ${sorted.length} entries`);
}

main();
