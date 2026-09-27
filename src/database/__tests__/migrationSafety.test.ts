import { type MigrationConnection, runMigrations } from "@/database/migrate";
import { assertMigrationPlanSafe, LEGACY_DESTRUCTIVE_MIGRATION } from "@/database/migrationSafety";

function connectionWithApplied(applied: string[] = []) {
	const query = vi.fn(async (sql: string) => {
		if (sql.includes("information_schema.TABLES")) return [[{ tableName: "_migrations" }], []];
		if (sql === "SELECT name FROM _migrations") return [applied.map((name) => ({ name })), []];
		return [[], []];
	});
	const execute = vi.fn().mockResolvedValue([{}, []]);
	return { query, execute, end: vi.fn() };
}

describe("legacy migration safety", () => {
	it("blocks pending 001 by identity even if its SQL was edited", () => {
		expect(() =>
			assertMigrationPlanSafe([{ name: LEGACY_DESTRUCTIVE_MIGRATION, sql: "SELECT 1" }], new Set()),
		).toThrowError(expect.objectContaining({ code: "LEGACY_MIGRATION_BLOCKED" }));
	});

	it("blocks the known destructive catalog delete under a renamed file", () => {
		expect(() =>
			assertMigrationPlanSafe([{ name: "099_copy.sql", sql: "DELETE\nFROM `restaurants`;" }], new Set()),
		).toThrowError(expect.objectContaining({ code: "LEGACY_MIGRATION_BLOCKED" }));
	});

	it("does not reinterpret an already-applied historic record", () => {
		expect(() =>
			assertMigrationPlanSafe(
				[{ name: LEGACY_DESTRUCTIVE_MIGRATION, sql: "DELETE FROM restaurants;" }],
				new Set([LEGACY_DESTRUCTIVE_MIGRATION]),
			),
		).not.toThrow();
	});

	it("checks the entire pending plan before executing migration SQL when state exists", async () => {
		const connection = connectionWithApplied();
		await expect(
			runMigrations(connection as unknown as MigrationConnection, [
				{ name: "000_base_schema.sql", sql: "CREATE TABLE restaurants (id INT);" },
				{ name: LEGACY_DESTRUCTIVE_MIGRATION, sql: "DELETE FROM restaurants;" },
			]),
		).rejects.toMatchObject({ code: "LEGACY_MIGRATION_BLOCKED" });

		expect(connection.query).toHaveBeenCalledTimes(2);
		expect(connection.query).not.toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE _migrations"));
		expect(connection.query).not.toHaveBeenCalledWith("CREATE TABLE restaurants (id INT);");
		expect(connection.execute).not.toHaveBeenCalled();
	});

	it("blocks a fresh chain before creating migration state", async () => {
		const connection = connectionWithApplied();
		connection.query.mockResolvedValueOnce([[], []]);

		await expect(
			runMigrations(connection as unknown as MigrationConnection, [
				{ name: "000_base_schema.sql", sql: "CREATE TABLE restaurants (id INT);" },
				{ name: LEGACY_DESTRUCTIVE_MIGRATION, sql: "DELETE FROM restaurants;" },
			]),
		).rejects.toMatchObject({ code: "LEGACY_MIGRATION_BLOCKED" });

		expect(connection.query).toHaveBeenCalledTimes(1);
		expect(connection.execute).not.toHaveBeenCalled();
	});

	it("runs safe pending files after the gate passes", async () => {
		const connection = connectionWithApplied(["000_base_schema.sql"]);
		await runMigrations(connection as unknown as MigrationConnection, [
			{ name: "000_base_schema.sql", sql: "historic SQL" },
			{ name: "002_additive.sql", sql: "ALTER TABLE restaurants ADD COLUMN active BOOLEAN NULL;" },
		]);

		expect(connection.query).toHaveBeenCalledWith("ALTER TABLE restaurants ADD COLUMN active BOOLEAN NULL;");
		expect(connection.execute).toHaveBeenCalledWith("INSERT INTO _migrations (name) VALUES (?)", ["002_additive.sql"]);
	});
});
