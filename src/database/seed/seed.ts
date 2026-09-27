import type { ResultSetHeader } from "mysql2";

import { database } from "@/common/database";
import { assertDisposableResetAllowed } from "@/database/resetSafety";
import { hkRestaurants } from "@/database/seed/hkRestaurants";

async function resetDisposableDatabase(): Promise<void> {
	// Evaluate the guard before acquiring a pool connection or issuing SQL.
	assertDisposableResetAllowed({
		NODE_ENV: process.env.NODE_ENV,
		RR_DISPOSABLE_DB: process.env.RR_DISPOSABLE_DB,
		RR_RESET_CONFIRMATION: process.env.RR_RESET_CONFIRMATION,
		DB_NAME: process.env.DB_NAME,
		RR_RESET_DATABASE: process.env.RR_RESET_DATABASE,
	});
	const connection = await database.getConnection();

	try {
		const [target] = await connection.query("SELECT DATABASE() AS name");
		const selected = (target as Array<{ name: string }>)[0]?.name;
		if (selected !== process.env.RR_RESET_DATABASE || !selected?.startsWith("rr_disposable_")) {
			throw new Error("Connected database does not match the disposable reset target");
		}
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
		console.log(`Disposable reset complete: ${hkRestaurants.length} restaurants, ${dishCount} main dishes.`);
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
		await database.end();
	}
}

resetDisposableDatabase().catch((error: unknown) => {
	if (error instanceof Error && "code" in error && error.code === "RESET_SAFETY_REFUSAL") {
		console.error(`Reset refused: ${error.message}`);
	} else {
		console.error("Disposable database reset failed.");
	}
	process.exitCode = 1;
});
