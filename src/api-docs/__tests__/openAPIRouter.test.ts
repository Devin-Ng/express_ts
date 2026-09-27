import { StatusCodes } from "http-status-codes";
import request from "supertest";

import { app } from "@/server";

import { generateOpenAPIDocument } from "../openAPIDocumentGenerator";

describe("OpenAPI Router", () => {
	describe("Swagger JSON route", () => {
		it("should return Swagger JSON content", async () => {
			// Arrange
			const expectedResponse = generateOpenAPIDocument();

			// Act
			const response = await request(app).get("/swagger.json");

			// Assert
			expect(response.status).toBe(StatusCodes.OK);
			expect(response.type).toBe("application/json");
			expect(response.body).toEqual(expectedResponse);
		});

		it("does not publish the disabled user API", () => {
			const document = generateOpenAPIDocument();

			expect(Object.keys(document.paths)).not.toContain("/users");
			expect(Object.keys(document.paths)).not.toContain("/users/{id}");
			expect(JSON.stringify(document.components ?? {})).not.toContain('"User"');
		});

		it("should serve the Swagger UI", async () => {
			// Act
			const response = await request(app).get("/");

			// Assert
			expect(response.status).toBe(StatusCodes.OK);
			expect(response.text).toContain("swagger-ui");
		});
	});
});
