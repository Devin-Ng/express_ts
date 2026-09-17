import { StatusCodes } from "http-status-codes";

import type { MainDish, Restaurant, RestaurantFilter } from "@/api/restaurant/restaurantModel";
import { RestaurantRepository } from "@/api/restaurant/restaurantRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";

export class RestaurantService {
	private restaurantRepository: RestaurantRepository;

	constructor(repository: RestaurantRepository = new RestaurantRepository()) {
		this.restaurantRepository = repository;
	}

	async findAll(filter?: RestaurantFilter): Promise<ServiceResponse<Restaurant[] | null>> {
		try {
			const restaurants = await this.restaurantRepository.findAllAsync(filter);
			return ServiceResponse.success("Restaurants found", restaurants);
		} catch (ex) {
			logger.error(`Error finding restaurants: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while retrieving restaurants.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async findRandom(filter?: RestaurantFilter): Promise<ServiceResponse<Restaurant | null>> {
		try {
			const restaurant = await this.restaurantRepository.findRandomAsync(filter);
			if (!restaurant) {
				return ServiceResponse.failure("No restaurants match the selected filters", null, StatusCodes.NOT_FOUND);
			}
			return ServiceResponse.success("Restaurant picked", restaurant);
		} catch (ex) {
			logger.error(`Error picking a random restaurant: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while picking a random restaurant.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async findById(id: number): Promise<ServiceResponse<Restaurant | null>> {
		try {
			const restaurant = await this.restaurantRepository.findByIdAsync(id);
			if (!restaurant) {
				return ServiceResponse.failure("Restaurant not found", null, StatusCodes.NOT_FOUND);
			}
			return ServiceResponse.success("Restaurant found", restaurant);
		} catch (ex) {
			logger.error(`Error finding restaurant with id ${id}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while finding the restaurant.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async findDishesByRestaurantId(id: number): Promise<ServiceResponse<MainDish[] | null>> {
		try {
			const restaurant = await this.restaurantRepository.findByIdAsync(id);
			if (!restaurant) {
				return ServiceResponse.failure("Restaurant not found", null, StatusCodes.NOT_FOUND);
			}

			const dishes = await this.restaurantRepository.findDishesByRestaurantIdAsync(id);
			return ServiceResponse.success("Restaurant dishes found", dishes);
		} catch (ex) {
			logger.error(`Error finding dishes for restaurant ${id}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while retrieving restaurant dishes.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const restaurantService = new RestaurantService();
