# Add 10 Hong Kong restaurants

The new `db:seed:sample` command adds ten selected entries and twenty dishes from the project's existing Hong Kong dataset. It does not call the old destructive `db:seed` script. Prices in HKD, ratings, review counts, dishes and stock photos are development fixtures, not verified current menus or customer reviews. Locations identify sample branches; current opening status has not been checked.

The selected entries are Yung Kee and Mak's Noodle in Central & Western, Kam's Roast Goose and Joy Hing in Wan Chai, Australia Dairy Company and Kam Wah Café in Yau Tsim Mong, Tim Ho Wan and Kung Wo Beancurd Factory in Sham Shui Po, and Loaf On and Chuen Kee Seafood Restaurant in Sai Kung.

## Run from your Windows terminal

Your `.env` already passed `pnpm db:check`. Keep the same credentials; no password needs to be shared or changed for this command. Ensure MySQL Server is running and the existing migrations have already created the tables, then run:

```powershell
cd D:\project\RR\express_ts
pnpm db:seed:sample
```

If none of the selected restaurants exists, the expected output is `Hong Kong sample import complete: 10 restaurants and 20 dishes inserted; 0 existing restaurants skipped.` A repeat run should insert zero rows and report ten skipped restaurants. No new dependencies are required.

## Data-preservation behavior

The command matches an existing restaurant by name, region and district using your MySQL collation. A match skips the entire restaurant, including dishes: it does not change existing ratings, prices or photos, and does not add missing dishes to a matching restaurant. Therefore fewer than ten restaurants may be inserted if you already have some sample entries. Different spellings/aliases are not reconciled, and pre-existing duplicates are not removed.

Only INSERT and SELECT statements are used, with parameterized values. All inserts run in one transaction on InnoDB tables; errors before commit trigger rollback. A MySQL named lock prevents two copies of this sample command from inserting simultaneously. It does not coordinate other scripts or writers: do not run the old seed command or other imports at the same time. The command closes its connection pool on success or failure. No tables are created, altered, emptied or dropped.

If the command reports missing tables/columns, stop and inspect the schema. Do not run the historic migration chain to repair it: pending `001_hk_schema.sql` is intentionally blocked because it deletes restaurant rows. Follow `DATABASE_SAFETY_RUNBOOK.md` for fresh, existing, or partial shapes. Do not use `pnpm db:seed` for this task; that is a separately guarded destructive reset which replaces restaurant/dish data.

## View the data

If Express is not already running, run `pnpm start:dev`. Visit `http://localhost:8080/restaurants` for the list and `http://localhost:8080/restaurants/random` for a random restaurant. Existing restaurants remain visible too. For dishes, use `/restaurants/<id>/dishes` with an ID from the response; IDs are auto-generated and not assumed to start at 1.

In Workbench, refresh the Schemas panel and run the following SQL (change the schema name if your DB_NAME is different):

```sql
USE restaurant;
SELECT id, name, region, district, dish_type, rating, review_count
FROM restaurants
ORDER BY id;

SELECT r.name AS restaurant, d.dish_name, d.price AS demo_price_hkd
FROM main_dishes AS d
JOIN restaurants AS r ON r.id = d.restaurant_id
ORDER BY r.id, d.id;
```

The command and data files have been prepared in your project. This does not itself mean your Windows database has been populated; run the command above and check its output to confirm insertion.
