import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

import { env } from "@/common/utils/envConfig";

async function migrate(): Promise<void> {
	const migrationsDir = path.resolve(process.cwd(), "database", "migrations");
	const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

	const connection = await mysql.createConnection({
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME,
		multipleStatements: true,
	});

	try {
		await connection.query(
			`CREATE TABLE IF NOT EXISTS _migrations (
				name VARCHAR(255) NOT NULL PRIMARY KEY,
				applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
		);

		const [appliedRows] = await connection.query<mysql.RowDataPacket[]>("SELECT name FROM _migrations");
		const applied = new Set(appliedRows.map((row) => row.name as string));

		for (const file of files) {
			if (applied.has(file)) {
				console.log(`Skipping ${file} (already applied)`);
				continue;
			}

			const sql = await readFile(path.join(migrationsDir, file), "utf8");
			console.log(`Applying ${file}...`);
			await connection.query(sql);
			await connection.execute("INSERT INTO _migrations (name) VALUES (?)", [file]);
		}

		console.log("Migrations up to date.");
	} finally {
		await connection.end();
	}
}

migrate().catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
