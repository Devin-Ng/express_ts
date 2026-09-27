-- Run manually in MySQL Workbench using the local root/admin connection.
-- For local development only. Replace the password BEFORE executing.
-- If this account already exists, its password is not changed by this script.
-- Do not save/commit this file with your real password in it.
CREATE DATABASE IF NOT EXISTS restaurant
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'rr_app'@'localhost'
    IDENTIFIED BY 'REPLACE_WITH_YOUR_LOCAL_DB_PASSWORD';

-- Limited local runtime/import account; no DDL or grant-management rights.
-- Use separate read-only inventory and short-lived migration identities.
GRANT SELECT, INSERT, UPDATE, DELETE
    ON restaurant.* TO 'rr_app'@'localhost';
