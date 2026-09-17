import { StatusCodes } from "http-status-codes";
import type { Mock } from "vitest";

import type { RestaurantRepository } from "@/api/restaurant/restaurantRepository";
import { RestaurantService } from "@/api/restaurant/restaurantService";

describe("restaurantService", () => {
	let restaurantService: RestaurantService;
	let restaurantRepository: RestaurantRepository;

	beforeEach(() => {
		restaurantRepository = {
			findAllAsync: vi.fn(),
			findByIdAsync: vi.fn(),
			findDishesByRestaurantIdAsync: vi.fn(),
		} as unknown as RestaurantRepository;
		restaurantService = new RestaurantService(restaurantRepository);
	});

	it("returns restaurants", async () => {
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
		(restaurantRepository.findAllAsync as Mock).mockResolvedValue(restaurants);

		const result = await restaurantService.findAll();

		expect(result.statusCode).toBe(StatusCodes.OK);
		expect(result.responseObject).toEqual(restaurants);
	});

	it("returns dishes for an existing restaurant", async () => {
		const restaurant = {
			id: 1,
			name: "Sakura Ramen",
			region: "Midtown",
			dishType: "Japanese",
			rating: 4.8,
			reviewCount: 215,
		};
		const dishes = [{ id: 1, restaurantId: 1, dishName: "Tonkotsu Ramen", price: 15.5 }];
		(restaurantRepository.findByIdAsync as Mock).mockResolvedValue(restaurant);
		(restaurantRepository.findDishesByRestaurantIdAsync as Mock).mockResolvedValue(dishes);

		const result = await restaurantService.findDishesByRestaurantId(1);

		expect(result.statusCode).toBe(StatusCodes.OK);
		expect(result.responseObject).toEqual(dishes);
	});

	it("returns not found for dishes of an unknown restaurant", async () => {
		(restaurantRepository.findByIdAsync as Mock).mockResolvedValue(null);

		const result = await restaurantService.findDishesByRestaurantId(999);

		expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
		expect(result.responseObject).toBeNull();
	});
});