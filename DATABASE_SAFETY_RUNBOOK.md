# Database safety decision and runbook

Status: reviewed P0 decision for RR-003. This is an operational decision and safety boundary, not evidence that a database migration or restore has run. Historic `database/migrations/000_base_schema.sql` and `001_hk_schema.sql` remain immutable inputs.

## Decision

1. The legacy 001 migration is never replayed while pending. The runner blocks it before any SQL from a migration file (and before creating `_migrations`). There is no environment-variable bypass.
2. Fresh bootstrap and existing-database baseline are separate future workflows. P0 does not infer either state or implement the RR-010 checksum/lock migration engine.
3. An existing schema is never marked migrated solely because similarly named tables exist. A human-reviewed inventory, backup, restore rehearsal, shape comparison, and preservation checks are prerequisites.
4. Additive import (`db:seed:sample`) is distinct from destructive reset (`db:seed`). Reset is allowed only for an explicitly disposable development/test database whose name starts with `rr_disposable_`, with `RR_RESET_DATABASE` matching both `DB_NAME` and the connected database, plus the exact confirmation gate. It is always refused in production.
5. IDs, rows, and relationships in non-disposable databases are preservation constraints. Do not reset auto-increment values, delete the catalog, rebuild tables, or “repair” migration records in place.

## Non-negotiable boundaries

- Never edit, replace, or renumber applied historic 000/001 SQL. A corrected operation gets a new migration or a reviewed baseline procedure.
- Never manually insert `_migrations` records merely to bypass the guard. Recording a baseline asserts a verified schema state and requires approval and evidence.
- Never run migration, seed, reset, or test fixtures against a valuable database. This runbook does not authorize production writes.
- MySQL DDL can implicitly commit. Do not claim whole-migration rollback; restoration or a reviewed forward fix is the recovery route.
- Do not expose database credentials, restaurant/person values, or backup contents in inventory reports, tickets, or logs.
- Do not use the application runtime identity for migrations or restores. See `MYSQL_SETUP.md` for role separation.

The P0 filename/known-statement gate is containment for the shipped legacy migration, not a general SQL safety parser. All new migration SQL still needs code review; renaming or rewriting destructive SQL is not an approved workaround. RR-010 owns the future execution engine.

## Evidence to capture before choosing a path

1. Identify environment and owner; independently verify the intended host and schema name without copying credentials into evidence.
2. Stop or isolate application/import writers for the review window.
3. Create an owner-approved backup outside the app container and record only its redacted identifier, timestamp, retention, and responsible owner.
4. Restore that backup into an isolated database under a different identity/name. A backup that has not restored successfully is not sufficient.
5. Run the read-only inventory against both source and restored copy. It reports table/column/index/FK shape, exact aggregate row counts, and migration records without selecting catalog/person values.
6. Compare row counts, primary/foreign-key shape, orphan checks performed through an approved separate process, and representative application behavior on the isolated copy. Do not run write-based verification on the source.

## Shape decision matrix

| Observed shape | Classification | P0 action | Later approved path |
| --- | --- | --- | --- |
| No application tables and no `_migrations` | Fresh empty | Keep blocked; current chain includes destructive 001 | RR-010 supplies a new safe bootstrap representing the desired schema without legacy delete, tested on a disposable DB |
| Expected base tables and 000/001 both recorded | Existing complete | Preserve records and data; legacy files are skipped | Verify exact columns/indexes/FKs, then apply only new reviewed additive migrations |
| Expected post-001 columns/indexes exist but 001 is not recorded | Existing unbaselined | Do not replay 001 and do not auto-record it | Review provenance and exact shape; after restore rehearsal, an authorized baseline procedure may record verified state without executing legacy DML |
| 000 recorded, 001 pending, base pre-001 shape | Existing pre-001 | Do not run current runner | Create a new preservation-first upgrade/baseline plan on a clone; add fields/indexes without delete, verify, then record the approved new operation |
| Some post-001 columns/indexes exist, constraints differ, or a migration appears partially applied | Partial/ambiguous | Stop; no automated repair or baseline | Diagnose on a restored clone, compare every expected object, preserve IDs/FKs, and use a reviewed idempotent repair migration or restore |
| `_migrations` says applied but schema is missing/incompatible | Drift/corruption | Stop; do not delete records or replay history | Incident review, restore or explicit forward repair; retain evidence of original records and checksums when RR-010 adds them |
| Unexpected tables, duplicate constraints, non-InnoDB target tables, orphaned relationships, or unexplained counts | Unknown/unsafe | Stop and escalate | Resolve ownership and integrity on an isolated copy before any schema or import action |

An empty `restaurants` table alone does not prove that an environment is disposable or fresh. Likewise, table presence alone does not prove migration completion.

## Fresh database procedure (until RR-010)

1. Confirm by inventory that the target has no application tables and no migration records.
2. Confirm it is disposable and not reachable by production/staging clients.
3. Do not run `db:migrate`: the fail-closed guard intentionally rejects pending 001.
4. Wait for the reviewed safe bootstrap artifact from RR-010, then test it on a disposable database and repeat from a clean database to prove reproducibility.
5. Validate the resulting schema, empty row counts, FK/index shape, and migration state. Only then use the additive importer if fixture data is required.

The untracked 000 file is not, by itself, an approved bootstrap workflow; 001 remains in the ordered directory and is blocked.

## Existing complete database procedure

1. Complete backup and isolated restore rehearsal.
2. Inventory source and restored copy read-only; retain redacted aggregate evidence.
3. Verify historic records are present and schema matches the intended post-001 shape. Do not rerun or modify 000/001.
4. Test future additive migrations on the restored copy. Capture before/after row counts and stable ID sets using an approved internal comparison that does not disclose values.
5. Validate all FKs, orphan count, expected indexes, and application read paths before approving the same reviewed operation for an environment.
6. Keep a restore point and abort criteria through the change window.

## Existing unbaselined or partial database procedure

1. Stop immediately when shape and migration records disagree; the runner cannot safely infer history.
2. On the isolated restore, classify each expected table, column, index, FK, engine, and migration record as present, absent, or incompatible.
3. Determine whether legacy DDL partially committed. Never use row emptiness as evidence that legacy deletion is safe.
4. Choose either restore to a known good state or a new idempotent forward repair. The repair must check preconditions, preserve IDs/data, avoid destructive DML, and use a new reviewed identifier.
5. Only an authorized baseline process may add migration-state records, and only after exact shape and provenance are verified. Capture who approved it and the inventory evidence; do not fabricate execution history.
6. Re-run inventory and integrity checks on the clone, rehearse recovery, and obtain database/backend review before any target operation.

## Preservation and verification checklist

Before and after a rehearsed change on an isolated copy, verify:

- exact aggregate counts per application table;
- stable restaurant and dish ID sets using a private approved comparison, not report output;
- no missing/changed `main_dishes.restaurant_id` relationships and zero new orphans;
- expected PKs, FKs, uniqueness, indexes, engines, character sets/collations, nullability, and defaults;
- unchanged historic migration names/records and reviewed new records only;
- application read paths and additive importer repeat behavior;
- restore duration and owner-approved acceptance criteria.

Any unexplained count, ID, relationship, or schema difference is a stop condition. Do not “fix forward” on the source without a newly reviewed plan.

## Recovery and abort

Abort before applying if inventory is incomplete, restore has not been proven, the wrong host/schema might be selected, active writers cannot be controlled, privileges are broader/unreviewed, or the shape is ambiguous. During a rehearsed/approved operation, stop on failed preconditions, unexpected DDL state, count/relationship drift, lock failure, or partial application. Preserve logs without secrets or row values. Because DDL may already be committed, follow the preselected restore or reviewed forward-repair branch; do not blindly retry.

## Responsibility and remaining work

The database owner owns backup and restore authorization. The database/backend reviewer owns shape classification, preservation evidence, and migration approval. The deployment owner verifies environment targeting and writer isolation. RR-010 still owns a full safe migration engine (checksums, lock, crash handling, bootstrap/baseline implementation and real-MySQL tests). RR-028 owns staging and restore rehearsal. Credential rotation/history scanning, actual DB inventory, actual restore evidence, and iOS checks remain external/pending; this P0 code and document must not be used to mark all P0 work complete.
