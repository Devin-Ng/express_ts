import { hkRestaurants, type SeedRestaurant } from "@/database/seed/hkRestaurants";

// Development fixtures copied from the existing project dataset, not current listings.
// Prices (HKD), ratings and review counts are demo values; photos are stock images.
const selectedRestaurants = [
	["Yung Kee", "Central & Western"],
	["Mak's Noodle", "Central & Western"],
	["Kam's Roast Goose", "Wan Chai"],
	["Joy Hing", "Wan Chai"],
	["Australia Dairy Company", "Yau Tsim Mong"],
	["Kam Wah Café", "Yau Tsim Mong"],
	["Tim Ho Wan", "Sham Shui Po"],
	["Kung Wo Beancurd Factory", "Sham Shui Po"],
	["Loaf On", "Sai Kung"],
	["Chuen Kee Seafood Restaurant", "Sai Kung"],
] as const;

export const hkSampleRestaurants: SeedRestaurant[] = selectedRestaurants.map(([name, district]) => {
	const restaurant = hkRestaurants.find((item) => item.name === name && item.district === district);
	if (!restaurant) throw new Error(`Missing Hong Kong sample entry: ${name} (${district})`);
	return restaurant;
});
