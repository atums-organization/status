import { writeFileSync } from "fs";
import { version } from "../package.json";
import { spawnSync } from "child_process";

writeFileSync(
	"src/api/version.generated.ts",
	`export const VERSION = "${version}";\n`,
);

const result = spawnSync("bunx", ["vite", "build"], { stdio: "inherit" });
process.exit(result.status ?? 1);
