import { StatusCodes } from "http-status-codes";
import request from "supertest";

import { app } from "@/server";

describe("disabled user API", () => {
	it.each(["/users", "/users/1"])("does not expose %s at runtime", async (path) => {
		const response = await request(app).get(path);

		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
	});
});
