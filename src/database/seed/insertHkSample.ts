import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

import { hkSampleRestaurants } from "@/database/seed/hkSampleRestaurants";

const SAMPLE_LOCK = "rr:hk-sample:v1";

export async function insertHkSample(database: Pick<Pool, "getConnection">) {
	const connection = await database.getConnection();
	let locked = false;
	let inTransaction = false;
	const result = { insertedRestaurants: 0, insertedDishes: 0, skippedRestaurants: 0 };
	try {
		// Serialize repeat invocations of this command on the same MySQL instance.
		const [locks] = await connection.execute<RowDataPacket[]>("SELECT GET_LOCK(?, 10) AS acquired", [SAMPLE_LOCK]);
		if (locks[0]?.acquired !== 1) throw Object.assign(new Error("Sample import busy"), { code: "SAMPLE_BUSY" });
		locked = true;
		// Refuse nontransactional/missing tables rather than risk a partial import.
		const [tables] = await connection.query<RowDataPacket[]>(
			`SELECT TABLE_NAME AS tableName, ENGINE AS engine FROM information_schema.TABLES
			 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('restaurants', 'main_dishes')`,
		);
		if (tables.length !== 2 || tables.some((table) => table.engine !== "InnoDB")) {
			throw Object.assign(new Error("InnoDB tables required"), { code: "SAMPLE_SCHEMA_NOT_READY" });
		}
		await connection.beginTransaction();
		inTransaction = true;
		for (const restaurant of hkSampleRestaurants) {
			const [existing] = await connection.execute<RowDataPacket[]>(
				"SELECT id FROM restaurants WHERE name = ? AND region = ? AND district = ? LIMIT 1",
				[restaurant.name, restaurant.region, restaurant.district],
			);
			if (existing.length > 0) {
				result.skippedRestaurants++;
				continue; // Preserve this restaurant AND all its existing dishes unchanged.
			}
			const [inserted] = await connection.execute<ResultSetHeader>(
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
			result.insertedRestaurants++;
			for (const dish of restaurant.dishes) {
				await connection.execute(
					"INSERT INTO main_dishes (restaurant_id, dish_name, price, photo_url) VALUES (?, ?, ?, ?)",
					[inserted.insertId, dish.name, dish.price, dish.photoUrl],
				);
				result.insertedDishes++;
			}
		}
		await connection.commit();
		inTransaction = false;
		return result;
	} catch (error) {
		if (inTransaction) await connection.rollback();
		throw error;
	} finally {
		try {
			if (locked) await connection.execute("SELECT RELEASE_LOCK(?)", [SAMPLE_LOCK]);
		} finally {
			connection.release();
		}
	}
}
