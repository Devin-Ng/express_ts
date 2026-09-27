export const LEGACY_DESTRUCTIVE_MIGRATION = "001_hk_schema.sql";

const LEGACY_RESTAURANT_DELETE = /\bDELETE\s+FROM\s+`?restaurants`?\b/i;

export interface MigrationSource {
	name: string;
	sql: string;
}

export class MigrationSafetyError extends Error {
	readonly code = "LEGACY_MIGRATION_BLOCKED";

	constructor(migrationName: string) {
		super(
			`Pending migration ${migrationName} is blocked because it contains the legacy catalog delete. ` +
				"No migration SQL was executed. Follow DATABASE_SAFETY_RUNBOOK.md instead of editing or bypassing history.",
		);
		this.name = "MigrationSafetyError";
	}
}

/**
 * P0 fail-closed gate for the historic destructive migration.
 *
 * The filename is blocked even if its local SQL is changed, so changing an
 * already-published migration cannot become a bypass. The known destructive
 * statement is also blocked if the file is copied or renamed. Applied records
 * are left alone; deciding whether an unrecorded schema can be baselined is a
 * reviewed operational decision, not something this runner infers.
 */
export function assertMigrationPlanSafe(migrations: readonly MigrationSource[], applied: ReadonlySet<string>): void {
	for (const migration of migrations) {
		if (applied.has(migration.name)) continue;

		if (migration.name === LEGACY_DESTRUCTIVE_MIGRATION || LEGACY_RESTAURANT_DELETE.test(migration.sql)) {
			throw new MigrationSafetyError(migration.name);
		}
	}
}
