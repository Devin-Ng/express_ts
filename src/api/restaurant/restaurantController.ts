import type { Request, RequestHandler, Response } from "express";

import { RestaurantFilterSchema } from "@/api/restaurant/restaurantModel";
import { restaurantService } from "@/api/restaurant/restaurantService";

class RestaurantController {
	public getRestaurants: RequestHandler = async (req: Request, res: Response) => {
		const filter = RestaurantFilterSchema.parse(req.query);
		const serviceResponse = await restaurantService.findAll(filter);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getRandomRestaurant: RequestHandler = async (req: Request, res: Response) => {
		const filter = RestaurantFilterSchema.parse(req.query);
		const serviceResponse = await restaurantService.findRandom(filter);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getRestaurant: RequestHandler = async (req: Request, res: Response) => {
		const id = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await restaurantService.findById(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getRestaurantDishes: RequestHandler = async (req: Request, res: Response) => {
		const id = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await restaurantService.findDishesByRestaurantId(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const restaurantController = new RestaurantController();
