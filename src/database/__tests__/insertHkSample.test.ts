import type { Pool } from "mysql2/promise";

import { hkSampleRestaurants } from "@/database/seed/hkSampleRestaurants";
import { insertHkSample } from "@/database/seed/insertHkSample";

function mockDatabase(existingNames: string[] = []) {
	const names = new Set(existingNames);
	let nextId = 100;
	const connection = {
		query: vi.fn().mockResolvedValue([
			[
				{ tableName: "restaurants", engine: "InnoDB" },
				{ tableName: "main_dishes", engine: "InnoDB" },
			],
		]),
		execute: vi.fn(async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
			if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
			if (sql.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
			if (sql.startsWith("SELECT id")) return [names.has(String(params[0])) ? [{ id: 1 }] : []];
			if (sql.startsWith("INSERT INTO restaurants")) {
				names.add(String(params[0]));
				return [{ insertId: nextId++ }];
			}
			if (sql.startsWith("INSERT INTO main_dishes")) return [{ affectedRows: 1 }];
			throw new Error("Unexpected query");
		}),
		beginTransaction: vi.fn().mockResolvedValue(undefined),
		commit: vi.fn().mockResolvedValue(undefined),
		rollback: vi.fn().mockResolvedValue(undefined),
		release: vi.fn(),
	};
	const pool = { getConnection: vi.fn().mockResolvedValue(connection) } as unknown as Pool;
	return { pool, connection };
}

describe("insertHkSample", () => {
	it("inserts ten restaurants and twenty dishes without destructive statements", async () => {
		const { pool, connection } = mockDatabase();
		expect(await insertHkSample(pool)).toEqual({ insertedRestaurants: 10, insertedDishes: 20, skippedRestaurants: 0 });
		const calls = connection.execute.mock.calls;
		expect(calls.some(([sql]) => /\b(DELETE|UPDATE|TRUNCATE|ALTER|DROP|REPLACE)\b/i.test(sql))).toBe(false);
		const dishes = calls.filter(([sql]) => sql.startsWith("INSERT INTO main_dishes"));
		expect(dishes.map(([, params]) => params?.[0])).toEqual(
			Array.from({ length: 20 }, (_, i) => 100 + Math.floor(i / 2)),
		);
		expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
		expect(connection.commit).toHaveBeenCalledTimes(1);
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledTimes(1);
	});

	it("skips an existing restaurant and its dishes without updating either", async () => {
		const { pool, connection } = mockDatabase([hkSampleRestaurants[0].name]);
		expect(await insertHkSample(pool)).toEqual({ insertedRestaurants: 9, insertedDishes: 18, skippedRestaurants: 1 });
		expect(connection.execute.mock.calls.filter(([sql]) => sql.startsWith("INSERT INTO restaurants"))).toHaveLength(9);
	});

	it("adds nothing on a repeat run", async () => {
		const { pool } = mockDatabase();
		await insertHkSample(pool);
		expect(await insertHkSample(pool)).toEqual({ insertedRestaurants: 0, insertedDishes: 0, skippedRestaurants: 10 });
	});

	it("rolls back an insert error, releases the lock and returns the connection", async () => {
		const { pool, connection } = mockDatabase();
		const original = connection.execute.getMockImplementation();
		const error = new Error("dish insert failed");
		connection.execute.mockImplementation(async (sql, params) => {
			if (sql.startsWith("INSERT INTO main_dishes")) throw error;
			return original?.(sql, params) ?? [];
		});
		await expect(insertHkSample(pool)).rejects.toBe(error);
		expect(connection.rollback).toHaveBeenCalledTimes(1);
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.execute).toHaveBeenLastCalledWith("SELECT RELEASE_LOCK(?)", ["rr:hk-sample:v1"]);
		expect(connection.release).toHaveBeenCalledTimes(1);
	});

	it("refuses missing or nontransactional tables before making changes", async () => {
		const { pool, connection } = mockDatabase();
		connection.query.mockResolvedValueOnce([[{ tableName: "restaurants", engine: "MyISAM" }]]);
		await expect(insertHkSample(pool)).rejects.toMatchObject({ code: "SAMPLE_SCHEMA_NOT_READY" });
		expect(connection.beginTransaction).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledTimes(1);
	});

	it("does not start a transaction if another import holds the lock", async () => {
		const { pool, connection } = mockDatabase();
		connection.execute.mockResolvedValueOnce([[{ acquired: 0 }]]);
		await expect(insertHkSample(pool)).rejects.toMatchObject({ code: "SAMPLE_BUSY" });
		expect(connection.beginTransaction).not.toHaveBeenCalled();
		expect(connection.execute).toHaveBeenCalledTimes(1);
		expect(connection.release).toHaveBeenCalledTimes(1);
	});
});
