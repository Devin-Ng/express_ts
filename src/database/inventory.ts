export interface DatabaseInventory {
	generatedAt: string;
	database: {
		// Database/schema identifiers are operational metadata, not credentials.
		name: string;
	};
	tables: Array<{
		name: string;
		engine: string | null;
		rowCount: number;
		columns: Array<{
			name: string;
			position: number;
			dataType: string;
			columnType: string;
			nullable: boolean;
			extra: string;
		}>;
		indexes: Array<{
			name: string;
			unique: boolean;
			columns: string[];
		}>;
	}>;
	foreignKeys: Array<{
		name: string;
		table: string;
		columns: string[];
		referencedTable: string;
		referencedColumns: string[];
		updateRule: string;
		deleteRule: string;
	}>;
	migrations: {
		tablePresent: boolean;
		records: Array<{ name: string; appliedAt: string | null }>;
	};
}

export interface InventoryConnection {
	query: (sql: string) => Promise<unknown>;
	rollback: () => Promise<void>;
	release: () => void;
}

export interface InventoryPool {
	getConnection: () => Promise<InventoryConnection>;
	end: () => Promise<void>;
}

type TableRow = { tableName: string; engine: string | null };
type ColumnRow = {
	tableName: string;
	columnName: string;
	ordinalPosition: number;
	dataType: string;
	columnType: string;
	isNullable: "YES" | "NO";
	extra: string;
};
type IndexRow = {
	tableName: string;
	indexName: string;
	nonUnique: number;
	sequence: number;
	columnName: string;
};
type ForeignKeyRow = {
	constraintName: string;
	tableName: string;
	columnName: string;
	ordinalPosition: number;
	referencedTableName: string;
	referencedColumnName: string;
	updateRule: string;
	deleteRule: string;
};
type MigrationRow = { name: string; appliedAt: Date | string | null };

export function quoteInventoryIdentifier(identifier: string): string {
	if (!identifier || identifier.includes("\0")) throw new Error("Inventory received an invalid metadata identifier");
	// Backtick-quote the whole identifier, doubling embedded backticks. Metadata
	// may legally contain spaces, hyphens, Unicode, or SQL punctuation.
	return `\`${identifier.replaceAll("`", "``")}\``;
}

function rows<T>(result: unknown): T[] {
	return (result as [T[], unknown])[0];
}

function toSafeInteger(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Inventory received an invalid aggregate row count");
	return parsed;
}

/**
 * Inspect metadata and aggregate counts only. The transaction is read-only and
 * always rolled back. No restaurant, dish, user, or credential values are selected.
 */
export async function collectDatabaseInventory(
	database: Pick<InventoryPool, "getConnection">,
	now: () => Date = () => new Date(),
): Promise<DatabaseInventory> {
	const connection = await database.getConnection();
	let transactionStarted = false;

	try {
		await connection.query("START TRANSACTION READ ONLY");
		transactionStarted = true;

		const databaseRows = rows<{ databaseName: string | null }>(
			await connection.query("SELECT DATABASE() AS databaseName"),
		);
		const databaseName = databaseRows[0]?.databaseName;
		if (!databaseName) throw new Error("No database is selected for inventory");

		const tableRows = rows<TableRow>(
			await connection.query(
				`SELECT TABLE_NAME AS tableName, ENGINE AS engine
				 FROM information_schema.TABLES
				 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
				 ORDER BY TABLE_NAME`,
			),
		);
		const columnRows = rows<ColumnRow>(
			await connection.query(
				`SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
					ORDINAL_POSITION AS ordinalPosition, DATA_TYPE AS dataType,
					COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable, EXTRA AS extra
				 FROM information_schema.COLUMNS
				 WHERE TABLE_SCHEMA = DATABASE()
				 ORDER BY TABLE_NAME, ORDINAL_POSITION`,
			),
		);
		const indexRows = rows<IndexRow>(
			await connection.query(
				`SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName,
					NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS sequence, COLUMN_NAME AS columnName
				 FROM information_schema.STATISTICS
				 WHERE TABLE_SCHEMA = DATABASE()
				 ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
			),
		);
		const foreignKeyRows = rows<ForeignKeyRow>(
			await connection.query(
				`SELECT k.CONSTRAINT_NAME AS constraintName, k.TABLE_NAME AS tableName,
					k.COLUMN_NAME AS columnName, k.ORDINAL_POSITION AS ordinalPosition,
					k.REFERENCED_TABLE_NAME AS referencedTableName,
					k.REFERENCED_COLUMN_NAME AS referencedColumnName,
					r.UPDATE_RULE AS updateRule, r.DELETE_RULE AS deleteRule
				 FROM information_schema.KEY_COLUMN_USAGE k
				 JOIN information_schema.REFERENTIAL_CONSTRAINTS r
					ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
					AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
					AND r.TABLE_NAME = k.TABLE_NAME
				 WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
				 ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`,
			),
		);

		const tableCounts = new Map<string, number>();
		for (const table of tableRows) {
			const countRows = rows<{ rowCount: number | bigint | string }>(
				await connection.query(`SELECT COUNT(*) AS rowCount FROM ${quoteInventoryIdentifier(table.tableName)}`),
			);
			tableCounts.set(table.tableName, toSafeInteger(countRows[0]?.rowCount));
		}

		const migrationTablePresent = tableRows.some((table) => table.tableName === "_migrations");
		const migrationRows = migrationTablePresent
			? rows<MigrationRow>(
					await connection.query("SELECT name, applied_at AS appliedAt FROM _migrations ORDER BY name"),
				)
			: [];

		const indexes = new Map<string, DatabaseInventory["tables"][number]["indexes"][number]>();
		for (const index of indexRows) {
			const key = `${index.tableName}\0${index.indexName}`;
			const existing = indexes.get(key);
			if (existing) existing.columns.push(index.columnName);
			else {
				indexes.set(key, {
					name: index.indexName,
					unique: index.nonUnique === 0,
					columns: [index.columnName],
				});
			}
		}

		const foreignKeys = new Map<string, DatabaseInventory["foreignKeys"][number]>();
		for (const foreignKey of foreignKeyRows) {
			const key = `${foreignKey.tableName}\0${foreignKey.constraintName}`;
			const existing = foreignKeys.get(key);
			if (existing) {
				existing.columns.push(foreignKey.columnName);
				existing.referencedColumns.push(foreignKey.referencedColumnName);
			} else {
				foreignKeys.set(key, {
					name: foreignKey.constraintName,
					table: foreignKey.tableName,
					columns: [foreignKey.columnName],
					referencedTable: foreignKey.referencedTableName,
					referencedColumns: [foreignKey.referencedColumnName],
					updateRule: foreignKey.updateRule,
					deleteRule: foreignKey.deleteRule,
				});
			}
		}

		return {
			generatedAt: now().toISOString(),
			database: { name: databaseName },
			tables: tableRows.map((table) => ({
				name: table.tableName,
				engine: table.engine,
				rowCount: tableCounts.get(table.tableName) ?? 0,
				columns: columnRows
					.filter((column) => column.tableName === table.tableName)
					.map((column) => ({
						name: column.columnName,
						position: Number(column.ordinalPosition),
						dataType: column.dataType,
						columnType: column.columnType,
						nullable: column.isNullable === "YES",
						extra: column.extra,
					})),
				indexes: indexRows
					.filter((index) => index.tableName === table.tableName && index.sequence === 1)
					.map((index) => indexes.get(`${index.tableName}\0${index.indexName}`))
					.filter((index): index is NonNullable<typeof index> => index !== undefined),
			})),
			foreignKeys: [...foreignKeys.values()],
			migrations: {
				tablePresent: migrationTablePresent,
				records: migrationRows.map((migration) => ({
					name: migration.name,
					appliedAt:
						migration.appliedAt instanceof Date
							? migration.appliedAt.toISOString()
							: migration.appliedAt === null
								? null
								: String(migration.appliedAt),
				})),
			},
		};
	} finally {
		try {
			if (transactionStarted) await connection.rollback();
		} finally {
			connection.release();
		}
	}
}
