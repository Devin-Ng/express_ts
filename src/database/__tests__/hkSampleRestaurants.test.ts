import { DISH_TYPES, HK_REGION_DISTRICTS } from "@/common/constants/hongKong";
import { hkSampleRestaurants } from "@/database/seed/hkSampleRestaurants";

describe("Hong Kong starter dataset", () => {
	it("contains ten unique Hong Kong restaurants and twenty sample dishes", () => {
		expect(hkSampleRestaurants).toHaveLength(10);
		const keys = hkSampleRestaurants.map((r) => `${r.name}|${r.region}|${r.district}`);
		expect(new Set(keys).size).toBe(10);
		expect(hkSampleRestaurants.reduce((count, r) => count + r.dishes.length, 0)).toBe(20);
	});

	it.each(hkSampleRestaurants)("has valid location and demo values for $name", (restaurant) => {
		const districts: readonly string[] = HK_REGION_DISTRICTS[restaurant.region];
		expect(districts).toContain(restaurant.district);
		expect(DISH_TYPES).toContain(restaurant.dishType);
		expect(restaurant.rating).toBeGreaterThanOrEqual(0);
		expect(restaurant.rating).toBeLessThanOrEqual(5);
		expect(Number.isInteger(restaurant.reviewCount)).toBe(true);
		expect(restaurant.reviewCount).toBeGreaterThanOrEqual(0);
		for (const dish of restaurant.dishes) {
			expect(dish.name.length).toBeGreaterThan(0);
			expect(dish.price).toBeGreaterThan(0);
			expect(dish.photoUrl).toMatch(/^https:\/\//);
		}
	});
});
