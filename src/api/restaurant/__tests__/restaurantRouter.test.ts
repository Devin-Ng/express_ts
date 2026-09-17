import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

const restaurants = [
	{
		id: 1,
		name: "Tim Ho Wan",
		region: "Kowloon",
		district: "Sham Shui Po",
		dishType: "Dim Sum",
		rating: 4.3,
		reviewCount: 5230,
	},
	{
		id: 2,
		name: "Samsen",
		region: "Hong Kong Island",
		district: "Wan Chai",
		dishType: "Thai",
		rating: 4.6,
		reviewCount: 2140,
	},
];

const dishes = [
	{ id: 1, restaurantId: 1, dishName: "Baked BBQ Pork Bun", price: 32, photoUrl: "https://example.com/bun.jpg" },
	{ id: 2, restaurantId: 1, dishName: "Har Gow", price: 40, photoUrl: "https://example.com/garow.jpg" },
];

vi.mock("@/api/restaurant/restaurantRepository", () => ({
	RestaurantRepository: class {
		async findAllAsync() {
			return restaurants;
		}

		async findRandomAsync() {
			return restaurants[0];
		}

		async findByIdAsync(id: number) {
			return restaurants.find((restaurant) => restaurant.id === id) ?? null;
		}

		async findDishesByRestaurantIdAsync(id: number) {
			return id === 1 ? dishes : [];
		}

		async findFilterOptionsAsync() {
			return { regions: [], districtsByRegion: {}, dishTypes: [] };
		}
	},
}));

describe("Restaurant API endpoints", () => {
	it("returns all restaurants", async () => {
		const response = await request(app).get("/restaurants");
		const responseBody: ServiceResponse<typeof restaurants> = response.body;

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(responseBody.responseObject).toEqual(restaurants);
	});

	it("accepts filter query parameters", async () => {
		const response = await request(app).get("/restaurants?region=Kowloon&dishType=Dim%20Sum&minRating=4");

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(response.body.responseObject).toEqual(restaurants);
	});

	it("rejects an invalid minimum rating", async () => {
		const response = await request(app).get("/restaurants?minRating=9");

		expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
	});

	it("returns a random restaurant", async () => {
		const response = await request(app).get("/restaurants/random?region=Kowloon");
		const responseBody: ServiceResponse<(typeof restaurants)[number]> = response.body;

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(responseBody.responseObject).toEqual(restaurants[0]);
	});

	it("returns a restaurant's dishes", async () => {
		const response = await request(app).get("/restaurants/1/dishes");
		const responseBody: ServiceResponse<typeof dishes> = response.body;

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(responseBody.responseObject).toEqual(dishes);
	});

	it("rejects an invalid restaurant ID", async () => {
		const response = await request(app).get("/restaurants/abc");

		expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
	});
});
