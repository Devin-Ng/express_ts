import { database } from "@/common/database";
import { databaseConnectionHint } from "@/database/connectionCheck";
import { insertHkSample } from "@/database/seed/insertHkSample";

async function main(): Promise<void> {
	try {
		const result = await insertHkSample(database);
		console.log(
			`Hong Kong sample import complete: ${result.insertedRestaurants} restaurants and ` +
				`${result.insertedDishes} dishes inserted; ${result.skippedRestaurants} existing restaurants skipped.`,
		);
		console.log("Existing data was not changed. Prices (HKD), ratings, reviews and photos are demo data.");
	} finally {
		await database.end();
	}
}

main().catch((error: unknown) => {
	const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
	if (["SAMPLE_SCHEMA_NOT_READY", "ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(String(code))) {
		console.error(
			"Sample import failed: required tables/columns are missing or tables are not InnoDB. " +
				"See HK_SAMPLE_DATA.md. Do not run migrations on existing data without reviewing them.",
		);
	} else if (code === "SAMPLE_BUSY") {
		console.error("Another sample import is running. Wait for it to finish, then retry.");
	} else {
		console.error(`Sample import failed. ${databaseConnectionHint(error)}`);
	}
	process.exitCode = 1;
});
