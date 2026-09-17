import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { commonValidations } from "@/common/utils/commonValidation";

extendZodWithOpenApi(z);

export type Restaurant = z.infer<typeof RestaurantSchema>;
export const RestaurantSchema = z.object({
	id: z.number(),
	name: z.string(),
	region: z.string(),
	district: z.string(),
	dishType: z.string().nullable(),
	rating: z.number(),
	reviewCount: z.number().int().nonnegative(),
});

export type MainDish = z.infer<typeof MainDishSchema>;
export const MainDishSchema = z.object({
	id: z.number(),
	restaurantId: z.number(),
	dishName: z.string(),
	price: z.number().nullable(),
	photoUrl: z.string().nullable(),
});

export type RestaurantFilter = z.infer<typeof RestaurantFilterSchema>;
export const RestaurantFilterSchema = z.object({
	region: z.string().min(1).optional(),
	district: z.string().min(1).optional(),
	dishType: z.string().min(1).optional(),
	minRating: z.coerce.number().min(0).max(5).optional(),
});

export const GetRestaurantsSchema = z.object({
	query: RestaurantFilterSchema,
});

export const GetRestaurantSchema = z.object({
	params: z.object({ id: commonValidations.id }),
});
