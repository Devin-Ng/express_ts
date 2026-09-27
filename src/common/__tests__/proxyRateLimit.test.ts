import request from "supertest";

import { app } from "@/server";

vi.mock("@/common/utils/envConfig", async (importOriginal) => {
	const { env } = await importOriginal<typeof import("@/common/utils/envConfig")>();
	return { env: { ...env, COMMON_RATE_LIMIT_MAX_REQUESTS: 2 } };
});

describe("Direct local connections and rate limiting", () => {
	it("does not trust arbitrary forwarding headers", () => {
		expect(app.get("trust proxy")).toBe(false);
		const trust = app.get("trust proxy fn") as (ip: string, hop: number) => boolean;
		expect(trust("127.0.0.1", 0)).toBe(false);
		expect(trust("192.0.2.1", 0)).toBe(false);
	});

	it("accepts local requests without proxy warnings and still enforces the limit", async () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const first = await request(app).get("/health-check");
			const second = await request(app).get("/health-check");
			const blocked = await request(app).get("/health-check");

			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			expect(first.headers["ratelimit-limit"]).toBe("2");
			expect(blocked.status).toBe(429);
			expect(blocked.text).toContain("Too many requests");
			expect(blocked.headers["retry-after"]).toBeDefined();
			expect(errors).not.toHaveBeenCalled();
		} finally {
			errors.mockRestore();
		}
	});
});
