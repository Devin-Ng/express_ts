import type { ResultSetHeader } from "mysql2";

import { database } from "@/common/database";
import { hkRestaurants } from "@/database/seed/hkRestaurants";

async function seed(): Promise<void> {
	const connection = await database.getConnection();

	try {
		await connection.beginTransaction();

		// main_dishes rows are removed via ON DELETE CASCADE
		await connection.query("DELETE FROM restaurants");
		await connection.query("ALTER TABLE restaurants AUTO_INCREMENT = 1");
		await connection.query("ALTER TABLE main_dishes AUTO_INCREMENT = 1");

		for (const restaurant of hkRestaurants) {
			const [result] = await connection.execute<ResultSetHeader>(
				`INSERT INTO restaurants (name, region, district, dish_type, rating, review_count)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[
					restaurant.name,
					restaurant.region,
					restaurant.district,
					restaurant.dishType,
					restaurant.rating,
					restaurant.reviewCount,
				],
			);

			const restaurantId = result.insertId;

			for (const dish of restaurant.dishes) {
				await connection.execute(
					`INSERT INTO main_dishes (restaurant_id, dish_name, price, photo_url)
					 VALUES (?, ?, ?, ?)`,
					[restaurantId, dish.name, dish.price, dish.photoUrl],
				);
			}
		}

		await connection.commit();

		const dishCount = hkRestaurants.reduce((total, restaurant) => total + restaurant.dishes.length, 0);
		console.log(`Seed complete: ${hkRestaurants.length} restaurants, ${dishCount} main dishes.`);
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
		await database.end();
	}
}

seed().catch((error) => {
	console.error("Seed failed:", error);
	process.exit(1);
});
