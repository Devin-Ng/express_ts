import { afterEach, describe, expect, it, vi } from "vitest";

const validEnvironment = {
	NODE_ENV: "test",
	DB_USER: "rr_unit_test",
	DB_PASSWORD: "TEST_FIXTURE_NOT_A_CREDENTIAL",
};

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("database credential configuration", () => {
	it.each([
		{ DB_USER: "" },
		{ DB_PASSWORD: "" },
		{ DB_PASSWORD: "REPLACE_WITH_LOCAL_DB_PASSWORD" },
	])("rejects missing or placeholder credentials without logging values", async (overrides) => {
		for (const [key, value] of Object.entries({ ...validEnvironment, ...overrides })) vi.stubEnv(key, value);
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		await expect(import("@/common/utils/envConfig")).rejects.toThrow("Invalid environment variables");
		expect(error).toHaveBeenCalledWith(
			"Invalid environment configuration. Check required values in .env.template; values are not logged.",
		);
	});

	it("accepts explicitly configured credentials", async () => {
		for (const [key, value] of Object.entries(validEnvironment)) vi.stubEnv(key, value);
		const { env } = await import("@/common/utils/envConfig");
		expect(env.DB_USER).toBe("rr_unit_test");
		expect(env.isTest).toBe(true);
	});
});
