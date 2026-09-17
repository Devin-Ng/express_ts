import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { commonValidations } from "@/common/utils/commonValidation";

extendZodWithOpenApi(z);

export type Restaurant = z.infer<typeof RestaurantSchema>;
export const RestaurantSchema = z.object({
	id: z.number(),
	name: z.string(),
	region: z.string(),
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
});

export const GetRestaurantSchema = z.object({
	params: z.object({ id: commonValidations.id }),
});