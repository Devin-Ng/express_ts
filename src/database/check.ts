import { database } from "@/common/database";
import { checkDatabaseConnection, databaseConnectionHint } from "@/database/connectionCheck";

checkDatabaseConnection(database)
	.then(() => {
		console.log("MySQL connection OK (SELECT 1 succeeded). This checks connectivity, not tables or seed data.");
	})
	.catch((error: unknown) => {
		console.error(`MySQL connection failed. ${databaseConnectionHint(error)}`);
		process.exitCode = 1;
	});
