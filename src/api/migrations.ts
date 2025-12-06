import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Echo } from "@atums/echo";
import type { SQL } from "bun";
import type { SqlMigration } from "../types";

const logger = new Echo({ disableFile: true });
const migrationsPath = resolve("src", "database", "migrations");

export async function runMigrations(sql: SQL): Promise<void> {
	const migrations: SqlMigration[] = [];

	try {
		const upPath = resolve(migrationsPath, "up");
		const downPath = resolve(migrationsPath, "down");

		const upFiles = await readdir(upPath);
		const sqlFiles = upFiles.filter((file) => file.endsWith(".sql")).sort();

		for (const sqlFile of sqlFiles) {
			const baseName = sqlFile.replace(".sql", "");
			const parts = baseName.split("_");
			const id = parts[0];
			const name = parts.slice(1).join("_") || "migration";

			if (!id || id.trim() === "") continue;

			const upSql = await readFile(resolve(upPath, sqlFile), "utf-8");
			let downSql: string | undefined;

			try {
				const downFiles = await readdir(downPath);
				const matchingDown = downFiles.find((file) =>
					file.startsWith(`${id}_`),
				);
				if (matchingDown) {
					downSql = await readFile(resolve(downPath, matchingDown), "utf-8");
				}
			} catch {}

			migrations.push({
				id,
				name,
				upSql: upSql.trim(),
				...(downSql && { downSql: downSql.trim() }),
			});
		}

		logger.debug(`Loaded ${migrations.length} migrations`);
	} catch {
		logger.debug("No migrations directory found");
		return;
	}

	if (migrations.length === 0) return;

	await sql.unsafe(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id TEXT PRIMARY KEY,
			name TEXT,
			executed_at TIMESTAMPTZ DEFAULT NOW(),
			checksum TEXT
		)
	`);

	const executed = await sql`SELECT id FROM schema_migrations`;
	const executedIds = new Set(executed.map((r: { id: string }) => r.id));

	const pending = migrations.filter((m) => !executedIds.has(m.id));
	if (pending.length === 0) {
		logger.debug("All migrations are up to date");
		return;
	}

	logger.info(`Running ${pending.length} pending migrations...`);

	for (const migration of pending) {
		logger.debug(`Running migration: ${migration.id} - ${migration.name}`);
		await sql.unsafe(migration.upSql);

		const checksum = generateChecksum(migration.upSql);
		await sql`
			INSERT INTO schema_migrations (id, name, checksum)
			VALUES (${migration.id}, ${migration.name}, ${checksum})
		`;
		logger.debug(`Migration ${migration.id} completed`);
	}

	logger.info("All migrations completed successfully");
}

function generateChecksum(input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash.toString(16);
}
