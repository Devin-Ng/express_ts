import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export type FilterOptions = z.infer<typeof FilterOptionsSchema>;
export const FilterOptionsSchema = z.object({
	regions: z.array(z.string()),
	districtsByRegion: z.record(z.array(z.string())),
	dishTypes: z.array(z.string()),
});
