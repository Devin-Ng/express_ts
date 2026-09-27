# Connect RR Express to local MySQL on Windows

Workbench is a graphical client. MySQL Server stores the data. Your Express project already uses `mysql2/promise` and a connection pool in `src/common/database.ts`; Express connects directly to Server, not through Workbench. Workbench may be closed while Express runs.

## Confirm MySQL Server is installed

Open MySQL Workbench. Under MySQL Connections, open a local connection if one exists. Otherwise click the + button, choose Standard (TCP/IP), use hostname `127.0.0.1`, port `3306`, username `root`, and click Test Connection. Enter the root password you chose when configuring MySQL Server; this is not your Windows password.

If connection is refused, press Win+R, enter `services.msc`, and look for a MySQL service (often `MySQL80`, but the name may differ). Start it if stopped. If none exists, open MySQL Installer, choose Add, select MySQL Server, and complete its configuration. If Installer itself is not installed, run the MySQL Installer MSI you downloaded earlier. Choose Development Computer, TCP/IP on port 3306, recommended strong authentication, and a Windows service. Set a root password privately. Local Express access does not require opening port 3306 to other computers. Return to Workbench and retry Test Connection.

## Create a fresh database and local app user

In the working root connection in Workbench, open a new SQL tab. Replace the password placeholder below with your own strong password before executing the SQL with the lightning-bolt button. Use the same password later in `.env`. Do not send or commit it. These SQL statements are also available in `database/setup-local.sql`.

```sql
CREATE DATABASE IF NOT EXISTS restaurant
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rr_app'@'localhost'
    IDENTIFIED BY 'REPLACE_WITH_LOCAL_DB_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE
    ON restaurant.* TO 'rr_app'@'localhost';
```

If `rr_app` already exists, `CREATE USER IF NOT EXISTS` will not change its password. Use its existing password rather than assuming the placeholder was applied. `localhost` restricts the MySQL account to local connections; use `127.0.0.1` for the app's TCP host. Do not change the user host to `%` or grant access to all databases to solve a local connection issue.

This creates a local-development runtime/import account limited to `restaurant`. It intentionally has DML but no DDL or grant-management privileges. Do not use the root connection in Express. Run reviewed schema changes with a separate migration account only for the migration window; production should use distinct runtime, inventory, migration, and backup identities as described below.

## Set the Express environment

If `.env` does not exist, copy `.env.template` to `.env` in `D:\project\RR\express_ts`. Never overwrite an existing configuration. Replace the placeholder privately with the app user's password and verify host, port, and database before connecting.

```dotenv
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="rr_app"
DB_PASSWORD="REPLACE_WITH_LOCAL_DB_PASSWORD"
DB_NAME="restaurant"
```

Keep passwords quoted, especially if they contain `#`. For the easiest copy/paste setup, avoid quotation marks and backslashes in this development password, or escape them correctly for both SQL and dotenv. `.env` is already ignored by Git. Never put database credentials in the React Native app. On another checkout, copy `.env.template` to `.env` first without overwriting an existing configuration.

## Test the connection

Open a PowerShell terminal in the Express folder. This project uses pnpm (see `packageManager` in `package.json`). If pnpm is not available, install the project version with `npm install -g pnpm@10.33.0` before continuing.

```powershell
cd D:\project\RR\express_ts
pnpm install --frozen-lockfile
pnpm db:check
```

Success prints `MySQL connection OK (SELECT 1 succeeded)`. This checks the actual configured database connection, not table availability. Failure prints a setup hint and exits with a nonzero status; it does not print the password or raw driver error. Nothing is written to the database by this check.

## Inspect the current database safely

Before deciding whether a schema is fresh, existing, or partial, run `pnpm db:inventory` through a dedicated read-only account.

Then run `pnpm db:inventory`. It emits JSON containing the selected database name, table/column/index/FK metadata, exact aggregate row counts, and `_migrations` names/timestamps. It starts one read-only transaction and rolls it back. It does not select restaurant, dish, user, or credential values. Treat database/table names, counts, and migration timestamps as operational metadata and store the report only in an approved location.

The equivalent direct command is `node --import=tsx src/database/inventoryCli.ts`. See `DATABASE_SAFETY_RUNBOOK.md` before making a migration decision.

## Migration safety and starting Express

The migration runner now fails closed before executing any migration-file SQL whenever legacy `001_hk_schema.sql` is pending (or the known catalog-delete statement appears in another pending file). This intentionally means `pnpm db:migrate` cannot bootstrap the current historic 000/001 chain. Do not rename, edit, mark applied, or bypass migration 001 to make the command pass. Follow the reviewed fresh/existing/partial paths in `DATABASE_SAFETY_RUNBOOK.md`; the safe bootstrap/baseline implementation belongs to RR-010.

After an approved schema path has established the expected tables, run:

```powershell
pnpm start:dev
```

Open `http://localhost:8080/restaurants` in a browser. With a fresh, unseeded database, it should return a successful response containing an empty array. `/health-check` alone only checks the HTTP server; it does not prove MySQL connectivity.

## Additive import versus disposable reset

`pnpm db:seed:sample` is the additive sample import. It uses SELECT and INSERT, preserves matching restaurants and their dishes, and does not reset IDs. See `HK_SAMPLE_DATA.md` for its limitations. Prefer it when preservation is required.

`pnpm db:seed` is a destructive catalog reset, not an import. It deletes restaurants, cascades dishes, resets auto-increment values, and reloads fixtures. It is refused unless all of the following are true before a database connection is acquired:

- `NODE_ENV` is exactly `development` or `test`;
- `RR_DISPOSABLE_DB` is exactly `true`;
- `DB_NAME` starts with `rr_disposable_`, and `RR_RESET_DATABASE` matches it exactly; and
- `RR_RESET_CONFIRMATION` exactly matches the confirmation phrase printed in `src/database/resetSafety.ts`.

Production is always refused even if other values are set. The connected `SELECT DATABASE()` result must also match the explicitly confirmed disposable name before destructive SQL. These guards prevent common targeting mistakes, not a substitute for a disposable-only database identity. Use this only for an isolated disposable database after independently verifying `DB_HOST` and `DB_NAME`; never set these reset variables persistently in `.env`, CI defaults, staging, or production. MySQL DDL can implicitly commit, so the reset's transaction is not a complete rollback guarantee.

## Least-privilege database roles

Use separate credentials per environment and purpose. The examples below are privilege intent, not copy-paste account provisioning; account host restrictions, TLS, secret generation, backup tooling, and managed-service roles must be approved for the deployment.

| Role | Typical privileges | Must not have |
| --- | --- | --- |
| Runtime API | `SELECT` for a read-only release; add only specific `INSERT`/`UPDATE`/`DELETE` needed by an approved feature | DDL, `GRANT OPTION`, global privileges, access to unrelated schemas |
| Inventory/audit | `SELECT` on `information_schema` metadata available to that account and `SELECT` on the application schema for exact `COUNT(*)` and `_migrations` records | DML, DDL, account administration |
| Migration job | Narrow reviewed DDL/DML on the application schema for the duration of an exclusive migration job | Global admin, unrelated schemas, standing use by the API |
| Additive importer | `SELECT`, `INSERT`, and only explicitly approved update privileges on import target tables; ability to use advisory locks | DDL, destructive reset privileges unless using a separate disposable-only identity |
| Backup/restore | Provider/tool-specific read, backup, or restore permissions, held separately and audited | Runtime API use, unnecessary schema administration |

Revoke or disable elevated temporary access after the operation. Keep database port 3306 private and require encrypted transport across network boundaries. Never place any of these credentials in source, mobile bundles, notes, logs, reports, or command output.

Restart Express after changing `.env`. The normal request flow is React Native → Express HTTP API → MySQL Server. The phone never connects directly to port 3306. If Express later runs inside Docker or WSL instead of directly on Windows, `127.0.0.1` may point to that environment rather than Windows; adjust the host and account configuration for that deployment.

## If something fails

Connection refused usually means Server is missing/stopped or the host/port is wrong. Access denied means the app username/password or account host does not match. Unknown database means `restaurant` has not been created or `DB_NAME` is wrong. Missing table means migrations have not completed. See `pnpm db:check` first, then the Workbench connection test. Keep port 3306 private and retain recommended password authentication; `mysql2` supports it.
