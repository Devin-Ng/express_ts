import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

const restaurants = [
	{
		id: 1,
		name: "Sakura Ramen",
		region: "Midtown",
		dishType: "Japanese",
		rating: 4.8,
		reviewCount: 215,
	},
];

const dishes = [
	{ id: 1, restaurantId: 1, dishName: "Tonkotsu Ramen", price: 15.5 },
	{ id: 2, restaurantId: 1, dishName: "Pork Gyoza", price: 7 },
	{ id: 3, restaurantId: 1, dishName: "Matcha Ice Cream", price: 4.5 },
];

vi.mock("@/api/restaurant/restaurantRepository", () => ({
	RestaurantRepository: class {
		async findAllAsync() {
			return restaurants;
		}

		async findByIdAsync(id: number) {
			return restaurants.find((restaurant) => restaurant.id === id) ?? null;
		}

		async findDishesByRestaurantIdAsync(id: number) {
			return id === 1 ? dishes : [];
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