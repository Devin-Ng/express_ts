import { collectDatabaseInventory, type InventoryPool, quoteInventoryIdentifier } from "@/database/inventory";

const fixedNow = new Date("2026-09-27T10:00:00.000Z");

function mockInventoryDatabase() {
	const query = vi.fn(async (sql: string): Promise<unknown> => {
		if (sql === "START TRANSACTION READ ONLY") return [[], []];
		if (sql === "SELECT DATABASE() AS databaseName") return [[{ databaseName: "rr_test" }], []];
		if (sql.includes("information_schema.TABLES")) {
			return [
				[
					{ tableName: "_migrations", engine: "InnoDB" },
					{ tableName: "main_dishes", engine: "InnoDB" },
					{ tableName: "restaurants", engine: "InnoDB" },
				],
				[],
			];
		}
		if (sql.includes("information_schema.COLUMNS")) {
			return [
				[
					{
						tableName: "restaurants",
						columnName: "id",
						ordinalPosition: 1,
						dataType: "int",
						columnType: "int",
						isNullable: "NO",
						extra: "auto_increment",
					},
					{
						tableName: "restaurants",
						columnName: "name",
						ordinalPosition: 2,
						dataType: "varchar",
						columnType: "varchar(255)",
						isNullable: "NO",
						extra: "",
					},
				],
				[],
			];
		}
		if (sql.includes("information_schema.STATISTICS")) {
			return [
				[
					{ tableName: "restaurants", indexName: "PRIMARY", nonUnique: 0, sequence: 1, columnName: "id" },
					{
						tableName: "restaurants",
						indexName: "idx_region_name",
						nonUnique: 1,
						sequence: 1,
						columnName: "region",
					},
					{
						tableName: "restaurants",
						indexName: "idx_region_name",
						nonUnique: 1,
						sequence: 2,
						columnName: "name",
					},
				],
				[],
			];
		}
		if (sql.includes("information_schema.KEY_COLUMN_USAGE")) {
			return [
				[
					{
						constraintName: "fk_main_dishes_restaurant",
						tableName: "main_dishes",
						columnName: "restaurant_id",
						ordinalPosition: 1,
						referencedTableName: "restaurants",
						referencedColumnName: "id",
						updateRule: "RESTRICT",
						deleteRule: "CASCADE",
					},
				],
				[],
			];
		}
		if (sql === "SELECT COUNT(*) AS rowCount FROM `_migrations`") return [[{ rowCount: 2 }], []];
		if (sql === "SELECT COUNT(*) AS rowCount FROM `main_dishes`") return [[{ rowCount: 20 }], []];
		if (sql === "SELECT COUNT(*) AS rowCount FROM `restaurants`") return [[{ rowCount: 10 }], []];
		if (sql === "SELECT name, applied_at AS appliedAt FROM _migrations ORDER BY name") {
			return [[{ name: "000_base_schema.sql", appliedAt: new Date("2026-09-26T09:00:00.000Z") }], []];
		}
		throw new Error(`Unexpected inventory query: ${sql}`);
	});
	const connection = {
		query,
		rollback: vi.fn().mockResolvedValue(undefined),
		release: vi.fn(),
	};
	const pool = { getConnection: vi.fn().mockResolvedValue(connection), end: vi.fn() };
	return { pool, connection };
}

describe("collectDatabaseInventory", () => {
	it("quotes valid MySQL metadata identifiers without treating punctuation as SQL", () => {
		expect(quoteInventoryIdentifier("restaurant-archive")).toBe("`restaurant-archive`");
		expect(quoteInventoryIdentifier("a`b; DROP TABLE x")).toBe("`a``b; DROP TABLE x`");
		expect(() => quoteInventoryIdentifier("bad\0name")).toThrow();
	});
	it("reports metadata, aggregate counts, foreign keys and migration state", async () => {
		const { pool, connection } = mockInventoryDatabase();
		const inventory = await collectDatabaseInventory(pool as unknown as InventoryPool, () => fixedNow);

		expect(inventory.generatedAt).toBe(fixedNow.toISOString());
		expect(inventory.database).toEqual({ name: "rr_test" });
		expect(inventory.tables.find((table) => table.name === "restaurants")).toMatchObject({
			engine: "InnoDB",
			rowCount: 10,
			columns: [{ name: "id" }, { name: "name" }],
			indexes: [
				{ name: "PRIMARY", unique: true, columns: ["id"] },
				{ name: "idx_region_name", unique: false, columns: ["region", "name"] },
			],
		});
		expect(inventory.foreignKeys).toEqual([
			{
				name: "fk_main_dishes_restaurant",
				table: "main_dishes",
				columns: ["restaurant_id"],
				referencedTable: "restaurants",
				referencedColumns: ["id"],
				updateRule: "RESTRICT",
				deleteRule: "CASCADE",
			},
		]);
		expect(inventory.migrations).toEqual({
			tablePresent: true,
			records: [{ name: "000_base_schema.sql", appliedAt: "2026-09-26T09:00:00.000Z" }],
		});
		expect(connection.query).toHaveBeenNthCalledWith(1, "START TRANSACTION READ ONLY");
		expect(connection.rollback).toHaveBeenCalledTimes(1);
		expect(connection.release).toHaveBeenCalledTimes(1);
	});

	it("queries only metadata, migration records, and aggregate counts", async () => {
		const { pool, connection } = mockInventoryDatabase();
		await collectDatabaseInventory(pool as unknown as InventoryPool, () => fixedNow);

		const statements: string[] = connection.query.mock.calls.map((call: unknown[]) => String(call[0]));
		for (const sql of statements) {
			expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE)\b/i);
		}
		expect(statements.filter((sql) => /\bFROM\s+`?(restaurants|main_dishes)`?\b/i.test(sql))).toEqual([
			"SELECT COUNT(*) AS rowCount FROM `main_dishes`",
			"SELECT COUNT(*) AS rowCount FROM `restaurants`",
		]);
	});

	it("rolls back and releases the connection after an inventory failure", async () => {
		const error = new Error("metadata unavailable");
		const connection = {
			query: vi.fn().mockResolvedValueOnce([[], []]).mockRejectedValueOnce(error),
			rollback: vi.fn().mockResolvedValue(undefined),
			release: vi.fn(),
		};
		const pool = { getConnection: vi.fn().mockResolvedValue(connection) };

		await expect(collectDatabaseInventory(pool as unknown as Pick<InventoryPool, "getConnection">)).rejects.toBe(error);
		expect(connection.rollback).toHaveBeenCalledTimes(1);
		expect(connection.release).toHaveBeenCalledTimes(1);
	});

	it("releases without rollback if the read-only transaction cannot start", async () => {
		const error = new Error("read only unavailable");
		const connection = {
			query: vi.fn().mockRejectedValue(error),
			rollback: vi.fn(),
			release: vi.fn(),
		};
		const pool = { getConnection: vi.fn().mockResolvedValue(connection) };

		await expect(collectDatabaseInventory(pool as unknown as Pick<InventoryPool, "getConnection">)).rejects.toBe(error);
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledTimes(1);
	});
});
