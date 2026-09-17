import type { RowDataPacket } from "mysql2";

import { database } from "@/common/database";
import type { MainDish, Restaurant } from "./restaurantModel";

type RestaurantRow = RowDataPacket & {
	id: number;
	name: string;
	region: string;
	dish_type: string | null;
	rating: number;
	review_count: number;
};

type MainDishRow = RowDataPacket & {
	id: number;
	restaurant_id: number;
	dish_name: string;
	price: number | null;
};

function mapRestaurant(row: RestaurantRow): Restaurant {
	return {
		id: row.id,
		name: row.name,
		region: row.region,
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
	};
}

export class RestaurantRepository {
	async findAllAsync(): Promise<Restaurant[]> {
		const [rows] = await database.query<RestaurantRow[]>(
			"SELECT id, name, region, dish_type, rating, review_count FROM restaurants",
		);

		return rows.map(mapRestaurant);
	}

	async findByIdAsync(id: number): Promise<Restaurant | null> {
		const [rows] = await database.execute<RestaurantRow[]>(
			"SELECT id, name, region, dish_type, rating, review_count FROM restaurants WHERE id = ?",
			[id],
		);

		return rows.length > 0 ? mapRestaurant(rows[0]) : null;
	}

	async findDishesByRestaurantIdAsync(restaurantId: number): Promise<MainDish[]> {
		const [rows] = await database.execute<MainDishRow[]>(
			"SELECT id, restaurant_id, dish_name, price FROM main_dishes WHERE restaurant_id = ?",
			[restaurantId],
		);

		return rows.map(mapMainDish);
	}
}