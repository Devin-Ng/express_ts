import { StatusCodes } from "http-status-codes";
import type { Mock } from "vitest";

import type { RestaurantRepository } from "@/api/restaurant/restaurantRepository";
import { RestaurantService } from "@/api/restaurant/restaurantService";

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
];

describe("restaurantService", () => {
	let restaurantService: RestaurantService;
	let restaurantRepository: RestaurantRepository;

	beforeEach(() => {
		restaurantRepository = {
			findAllAsync: vi.fn(),
			findRandomAsync: vi.fn(),
			findByIdAsync: vi.fn(),
			findDishesByRestaurantIdAsync: vi.fn(),
			findFilterOptionsAsync: vi.fn(),
		} as unknown as RestaurantRepository;
		restaurantService = new RestaurantService(restaurantRepository);
	});

	it("returns restaurants", async () => {
		(restaurantRepository.findAllAsync as Mock).mockResolvedValue(restaurants);

		const result = await restaurantService.findAll();

		expect(result.statusCode).toBe(StatusCodes.OK);
		expect(result.responseObject).toEqual(restaurants);
	});

	it("returns an empty list when filters match nothing", async () => {
		(restaurantRepository.findAllAsync as Mock).mockResolvedValue([]);

		const result = await restaurantService.findAll({ district: "Nowhere" });

		expect(result.statusCode).toBe(StatusCodes.OK);
		expect(result.responseObject).toEqual([]);
	});

	it("passes filters through to the repository", async () => {
		(restaurantRepository.findAllAsync as Mock).mockResolvedValue(restaurants);
		const filter = { region: "Kowloon", dishType: "Dim Sum", minRating: 4 };

		await restaurantService.findAll(filter);

		expect(restaurantRepository.findAllAsync).toHaveBeenCalledWith(filter);
	});

	it("returns a random restaurant", async () => {
		(restaurantRepository.findRandomAsync as Mock).mockResolvedValue(restaurants[0]);

		const result = await restaurantService.findRandom({ region: "Kowloon" });

		expect(result.statusCode).toBe(StatusCodes.OK);
		expect(result.responseObject).toEqual(restaurants[0]);
	});

	it("returns not found when no restaurant matches the filters", async () => {
		(restaurantRepository.findRandomAsync as Mock).mockResolvedValue(null);

		const result = await restaurantService.findRandom({ minRating: 5 });

		expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
		expect(result.responseObject).toBeNull();
	});

	it("returns dishes for an existing restaurant", async () => {
		const dishes = [
			{ id: 1, restaurantId: 1, dishName: "Baked BBQ Pork Bun", price: 32, photoUrl: "https://example.com/bun.jpg" },
		];
		(restaurantRepository.findByIdAsync as Mock).mockResolvedValue(restaurants[0]);
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
