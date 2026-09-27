import type { Pool } from "mysql2/promise";

import { checkDatabaseConnection, databaseConnectionHint } from "@/database/connectionCheck";

describe("checkDatabaseConnection", () => {
	it("runs a read-only query and closes the pool", async () => {
		const pool = { query: vi.fn().mockResolvedValue([[{ result: 1 }], []]), end: vi.fn().mockResolvedValue(undefined) };

		await checkDatabaseConnection(pool as unknown as Pool);

		expect(pool.query).toHaveBeenCalledExactlyOnceWith("SELECT 1");
		expect(pool.end).toHaveBeenCalledTimes(1);
	});

	it("closes the pool even when the connection fails", async () => {
		const error = Object.assign(new Error("private details"), { code: "ECONNREFUSED" });
		const pool = { query: vi.fn().mockRejectedValue(error), end: vi.fn().mockResolvedValue(undefined) };

		await expect(checkDatabaseConnection(pool as unknown as Pool)).rejects.toBe(error);
		expect(pool.end).toHaveBeenCalledTimes(1);
	});

	it("reports a pool shutdown failure", async () => {
		const error = new Error("shutdown failed");
		const pool = { query: vi.fn().mockResolvedValue([[], []]), end: vi.fn().mockRejectedValue(error) };

		await expect(checkDatabaseConnection(pool as unknown as Pool)).rejects.toBe(error);
	});
});

describe("databaseConnectionHint", () => {
	it.each([
		["ECONNREFUSED", "Install/start"],
		["ER_ACCESS_DENIED_ERROR", "DB_USER/DB_PASSWORD"],
		["ER_BAD_DB_ERROR", "does not exist"],
		["ER_DBACCESS_DENIED_ERROR", "grants"],
		["ENOTFOUND", "127.0.0.1"],
		["ETIMEDOUT", "network/firewall"],
		["EHOSTUNREACH", "network/firewall"],
	])("explains %s without exposing driver error details", (code, expected) => {
		const error = Object.assign(new Error("secret-password"), { code });
		const hint = databaseConnectionHint(error);

		expect(hint).toContain(expected);
		expect(hint).not.toContain("secret-password");
	});

	it.each([
		null,
		undefined,
		"secret-password",
		new Error("secret-password"),
		{ code: "UNKNOWN" },
	])("handles unknown errors safely (%s)", (error) => {
		expect(databaseConnectionHint(error)).toContain("MYSQL_SETUP.md");
		expect(databaseConnectionHint(error)).not.toContain("secret-password");
	});
});
