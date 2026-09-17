import type { Request, RequestHandler, Response } from "express";

import { metaService } from "@/api/meta/metaService";

class MetaController {
	public getFilterOptions: RequestHandler = async (_req: Request, res: Response) => {
		const serviceResponse = await metaService.getFilterOptions();
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const metaController = new MetaController();
