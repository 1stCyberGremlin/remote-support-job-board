import { mkdir, writeFile } from "node:fs/promises";
import { GET } from "./job-source";

const response = await GET();
if (!response.ok) {
  throw new Error(`Job refresh failed with status ${response.status}`);
}

const payload = await response.text();
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/jobs.json", import.meta.url), payload);

const parsed = JSON.parse(payload) as { jobs?: unknown[]; mode?: string };
console.log(
  `Prepared ${parsed.jobs?.length ?? 0} ${parsed.mode ?? "unknown"} listings for GitHub Pages.`,
);
