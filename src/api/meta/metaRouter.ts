import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { metaController } from "@/api/meta/metaController";
import { FilterOptionsSchema } from "@/api/meta/metaModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";

export const metaRegistry = new OpenAPIRegistry();
export const metaRouter: Router = express.Router();

metaRegistry.register("FilterOptions", FilterOptionsSchema);

metaRegistry.registerPath({
	method: "get",
	path: "/meta/filters",
	tags: ["Meta"],
	responses: createApiResponse(FilterOptionsSchema, "Success"),
});

metaRouter.get("/filters", metaController.getFilterOptions);
