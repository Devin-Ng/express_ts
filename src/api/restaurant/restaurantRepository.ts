import type { RowDataPacket } from "mysql2";

import type { MainDish, Restaurant, RestaurantFilter } from "@/api/restaurant/restaurantModel";
import { database } from "@/common/database";

type RestaurantRow = RowDataPacket & {
	id: number;
	name: string;
	region: string;
	district: string;
	dish_type: string | null;
	rating: number;
	review_count: number;
};

type MainDishRow = RowDataPacket & {
	id: number;
	restaurant_id: number;
	dish_name: string;
	price: number | null;
	photo_url: string | null;
};

export type RestaurantFilterOptions = {
	regions: string[];
	districtsByRegion: Record<string, string[]>;
	dishTypes: string[];
};

function mapRestaurant(row: RestaurantRow): Restaurant {
	return {
		id: row.id,
		name: row.name,
		region: row.region,
		district: row.district,
		dishType: row.dish_type,
		rating: row.rating,
		reviewCount: row.review_count,
	};
}

function mapMainDish(row: MainDishRow): MainDish {
	return {
		id: row.id,
		restaurantId: row.restaurant_id,
		dishName: row.dish_name,
		price: row.price,
		photoUrl: row.photo_url,
	};
}

function buildFilterClause(filter?: RestaurantFilter): { where: string; params: (string | number)[] } {
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	if (filter?.region) {
		conditions.push("region = ?");
		params.push(filter.region);
	}
	if (filter?.district) {
		conditions.push("district = ?");
		params.push(filter.district);
	}
	if (filter?.dishType) {
		conditions.push("dish_type = ?");
		params.push(filter.dishType);
	}
	if (filter?.minRating !== undefined) {
		conditions.push("rating >= ?");
		params.push(filter.minRating);
	}

	return { where: conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "", params };
}

const RESTAURANT_COLUMNS = "id, name, region, district, dish_type, rating, review_count";

export class RestaurantRepository {
	async findAllAsync(filter?: RestaurantFilter): Promise<Restaurant[]> {
		const { where, params } = buildFilterClause(filter);
		const [rows] = await database.query<RestaurantRow[]>(
			`SELECT ${RESTAURANT_COLUMNS} FROM restaurants${where} ORDER BY name`,
			params,
		);

		return rows.map(mapRestaurant);
	}

	async findRandomAsync(filter?: RestaurantFilter): Promise<Restaurant | null> {
		const { where, params } = buildFilterClause(filter);
		const [rows] = await database.query<RestaurantRow[]>(
			`SELECT ${RESTAURANT_COLUMNS} FROM restaurants${where} ORDER BY RAND() LIMIT 1`,
			params,
		);

		return rows.length > 0 ? mapRestaurant(rows[0]) : null;
	}

	async findByIdAsync(id: number): Promise<Restaurant | null> {
		const [rows] = await database.execute<RestaurantRow[]>(
			`SELECT ${RESTAURANT_COLUMNS} FROM restaurants WHERE id = ?`,
			[id],
		);

		return rows.length > 0 ? mapRestaurant(rows[0]) : null;
	}

	async findDishesByRestaurantIdAsync(restaurantId: number): Promise<MainDish[]> {
		const [rows] = await database.execute<MainDishRow[]>(
			"SELECT id, restaurant_id, dish_name, price, photo_url FROM main_dishes WHERE restaurant_id = ?",
			[restaurantId],
		);

		return rows.map(mapMainDish);
	}

	async findFilterOptionsAsync(): Promise<RestaurantFilterOptions> {
		const [regionRows] = await database.query<RowDataPacket[]>(
			"SELECT DISTINCT region FROM restaurants ORDER BY region",
		);
		const [districtRows] = await database.query<RowDataPacket[]>(
			"SELECT DISTINCT region, district FROM restaurants ORDER BY region, district",
		);
		const [dishTypeRows] = await database.query<RowDataPacket[]>(
			"SELECT DISTINCT dish_type FROM restaurants WHERE dish_type IS NOT NULL ORDER BY dish_type",
		);

		const districtsByRegion: Record<string, string[]> = {};
		for (const row of districtRows) {
			const region = row.region as string;
			const district = row.district as string;
			if (!districtsByRegion[region]) {
				districtsByRegion[region] = [];
			}
			districtsByRegion[region].push(district);
		}

		return {
			regions: regionRows.map((row) => row.region as string),
			districtsByRegion,
			dishTypes: dishTypeRows.map((row) => row.dish_type as string),
		};
	}
}
