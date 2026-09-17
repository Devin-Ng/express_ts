-- Migration 001: Hong Kong schema extension
-- Adds district to restaurants and photo_url to main_dishes, plus filter indexes.
-- Removes the placeholder test data (Sakura Ramen / Midtown).

ALTER TABLE restaurants
	ADD COLUMN district VARCHAR(100) NOT NULL DEFAULT '' AFTER region;

ALTER TABLE main_dishes
	ADD COLUMN photo_url VARCHAR(500) NULL AFTER price;

CREATE INDEX idx_restaurants_region ON restaurants (region);
CREATE INDEX idx_restaurants_district ON restaurants (district);
CREATE INDEX idx_restaurants_dish_type ON restaurants (dish_type);
CREATE INDEX idx_restaurants_rating ON restaurants (rating);

-- Clearing placeholder rows (main_dishes rows cascade via FK)
DELETE FROM restaurants;
