import { StatusCodes } from "http-status-codes";

import type { FilterOptions } from "@/api/meta/metaModel";
import { RestaurantRepository } from "@/api/restaurant/restaurantRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";

export class MetaService {
	private restaurantRepository: RestaurantRepository;

	constructor(repository: RestaurantRepository = new RestaurantRepository()) {
		this.restaurantRepository = repository;
	}

	async getFilterOptions(): Promise<ServiceResponse<FilterOptions | null>> {
		try {
			const filterOptions = await this.restaurantRepository.findFilterOptionsAsync();
			return ServiceResponse.success("Filter options found", filterOptions);
		} catch (ex) {
			logger.error(`Error finding filter options: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while retrieving filter options.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const metaService = new MetaService();
