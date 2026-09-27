import { database } from "@/common/database";
import { collectDatabaseInventory } from "@/database/inventory";

async function main(): Promise<void> {
	try {
		const inventory = await collectDatabaseInventory(database);
		process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
	} finally {
		await database.end();
	}
}

main().catch(() => {
	// Do not print raw driver errors: they can contain connection or SQL details.
	console.error("Database inventory failed. Verify read-only access and connection settings; see MYSQL_SETUP.md.");
	process.exitCode = 1;
});
