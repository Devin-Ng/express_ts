import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

const filterOptions = {
	regions: ["Hong Kong Island", "Kowloon"],
	districtsByRegion: {
		"Hong Kong Island": ["Wan Chai"],
		Kowloon: ["Sham Shui Po"],
	},
	dishTypes: ["Dim Sum", "Thai"],
};

vi.mock("@/api/restaurant/restaurantRepository", () => ({
	RestaurantRepository: class {
		async findFilterOptionsAsync() {
			return filterOptions;
		}
	},
}));

describe("Meta API endpoints", () => {
	it("returns filter options", async () => {
		const response = await request(app).get("/meta/filters");
		const responseBody: ServiceResponse<typeof filterOptions> = response.body;

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(responseBody.responseObject).toEqual(filterOptions);
	});
});
