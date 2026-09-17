import type { Request, RequestHandler, Response } from "express";

import { restaurantService } from "@/api/restaurant/restaurantService";

class RestaurantController {
	public getRestaurants: RequestHandler = async (_req: Request, res: Response) => {
		const serviceResponse = await restaurantService.findAll();
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