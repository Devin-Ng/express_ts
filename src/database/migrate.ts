import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Connection } from "mysql2/promise";
import mysql from "mysql2/promise";

import { assertMigrationPlanSafe, type MigrationSource } from "@/database/migrationSafety";

export type MigrationConnection = Pick<Connection, "query" | "execute" | "end">;

export async function runMigrations(
	connection: MigrationConnection,
	migrations: readonly MigrationSource[],
): Promise<void> {
	// Inspect migration state without creating or changing anything. If the
	// historic table is absent, all files are pending and the legacy gate below
	// refuses the current chain before any write or migration-file SQL.
	const [migrationTableRows] = (await connection.query(
		`SELECT TABLE_NAME AS tableName
		 FROM information_schema.TABLES
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_migrations'`,
	)) as [mysql.RowDataPacket[], unknown];
	const migrationTablePresent = migrationTableRows.length === 1;
	const appliedRows = migrationTablePresent
		? (((await connection.query("SELECT name FROM _migrations")) as [mysql.RowDataPacket[], unknown])[0] ?? [])
		: [];
	const applied = new Set(appliedRows.map((row) => row.name as string));
	assertMigrationPlanSafe(migrations, applied);

	if (!migrationTablePresent) {
		await connection.query(
			`CREATE TABLE _migrations (
				name VARCHAR(255) NOT NULL PRIMARY KEY,
				applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
		);
	}

	for (const migration of migrations) {
		if (applied.has(migration.name)) {
			console.log(`Skipping ${migration.name} (already applied)`);
			continue;
		}

		console.log(`Applying ${migration.name}...`);
		await connection.query(migration.sql);
		await connection.execute("INSERT INTO _migrations (name) VALUES (?)", [migration.name]);
	}

	console.log("Migrations up to date.");
}

export async function loadMigrations(migrationsDir: string): Promise<MigrationSource[]> {
	const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
	return Promise.all(
		files.map(async (name) => ({
			name,
			sql: await readFile(path.join(migrationsDir, name), "utf8"),
		})),
	);
}

async function migrate(): Promise<void> {
	const { env } = await import("@/common/utils/envConfig");
	const migrations = await loadMigrations(path.resolve(process.cwd(), "database", "migrations"));
	const connection = await mysql.createConnection({
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME,
		multipleStatements: true,
	});

	try {
		await runMigrations(connection, migrations);
	} finally {
		await connection.end();
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	migrate().catch((error: unknown) => {
		if (error instanceof Error && "code" in error && error.code === "LEGACY_MIGRATION_BLOCKED") {
			console.error(error.message);
		} else {
			console.error("Migration failed. No further migration files were attempted.");
		}
		process.exitCode = 1;
	});
}
