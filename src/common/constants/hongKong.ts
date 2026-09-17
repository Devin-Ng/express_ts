export const HK_REGION_DISTRICTS = {
	"Hong Kong Island": ["Central & Western", "Eastern", "Southern", "Wan Chai"],
	Kowloon: ["Kowloon City", "Kwun Tong", "Sham Shui Po", "Wong Tai Sin", "Yau Tsim Mong"],
	"New Territories East": ["North", "Sai Kung", "Sha Tin", "Tai Po"],
	"New Territories West": ["Islands", "Kwai Tsing", "Tsuen Wan", "Tuen Mun", "Yuen Long"],
} as const;

export type HkRegion = keyof typeof HK_REGION_DISTRICTS;
export type HkDistrict = (typeof HK_REGION_DISTRICTS)[HkRegion][number];

export const DISH_TYPES = [
	"Bakery",
	"Cafe",
	"Cantonese",
	"Cha Chaan Teng",
	"Dim Sum",
	"Dessert",
	"French",
	"Hot Pot",
	"Indian",
	"Italian",
	"Japanese",
	"Korean",
	"Noodles",
	"Ramen",
	"Seafood",
	"Shanghainese",
	"Sichuan",
	"Street Food",
	"Sushi",
	"Taiwanese",
	"Thai",
	"Vietnamese",
	"Western",
] as const;

export type DishType = (typeof DISH_TYPES)[number];
