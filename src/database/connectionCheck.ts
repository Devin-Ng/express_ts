import type { Pool } from "mysql2/promise";

// One-shot CLI check: always close the supplied pool so the command can exit.
// Do not call this with the running Express server's pool.
export async function checkDatabaseConnection(database: Pick<Pool, "query" | "end">): Promise<void> {
	try {
		await database.query("SELECT 1");
	} finally {
		await database.end();
	}
}

export function databaseConnectionHint(error: unknown): string {
	const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

	switch (code) {
		case "ECONNREFUSED":
			return "MySQL Server is not accepting connections. Install/start the Windows MySQL service and check DB_HOST/DB_PORT.";
		case "ER_ACCESS_DENIED_ERROR":
			return "MySQL rejected the login. Check DB_USER/DB_PASSWORD in .env and the user's allowed host in Workbench.";
		case "ER_BAD_DB_ERROR":
			return "The database does not exist. Create the database named by DB_NAME in Workbench first.";
		case "ER_DBACCESS_DENIED_ERROR":
			return "The MySQL user cannot access this database. Check its grants and DB_NAME in Workbench.";
		case "ENOTFOUND":
			return "DB_HOST could not be resolved. For a local Windows installation, use 127.0.0.1.";
		case "ETIMEDOUT":
		case "EHOSTUNREACH":
			return "MySQL could not be reached. Check DB_HOST/DB_PORT, the server service, and network/firewall settings.";
		default:
			// Never print raw driver errors: they may contain connection details or SQL.
			return "Could not verify the MySQL connection. Check the Server service and .env settings; see MYSQL_SETUP.md.";
	}
}
