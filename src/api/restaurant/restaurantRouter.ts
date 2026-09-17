import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import {
	GetRestaurantSchema,
	MainDishSchema,
	RestaurantSchema,
} from "@/api/restaurant/restaurantModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { restaurantController } from "./restaurantController";

export const restaurantRegistry = new OpenAPIRegistry();
export const restaurantRouter: Router = express.Router();

restaurantRegistry.register("Restaurant", RestaurantSchema);
restaurantRegistry.register("MainDish", MainDishSchema);

restaurantRegistry.registerPath({
	method: "get",
	path: "/restaurants",
	tags: ["Restaurant"],
	responses: createApiResponse(z.array(RestaurantSchema), "Success"),
});

restaurantRouter.get("/", restaurantController.getRestaurants);

restaurantRegistry.registerPath({
	method: "get",
	path: "/restaurants/{id}",
	tags: ["Restaurant"],
	request: { params: GetRestaurantSchema.shape.params },
	responses: createApiResponse(RestaurantSchema, "Success"),
});

restaurantRouter.get("/:id", validateRequest(GetRestaurantSchema), restaurantController.getRestaurant);

restaurantRegistry.registerPath({
	method: "get",
	path: "/restaurants/{id}/dishes",
	tags: ["Restaurant"],
	request: { params: GetRestaurantSchema.shape.params },
	responses: createApiResponse(z.array(MainDishSchema), "Success"),
});

restaurantRouter.get(
	"/:id/dishes",
	validateRequest(GetRestaurantSchema),
	restaurantController.getRestaurantDishes,
);