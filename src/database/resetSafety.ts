export const DISPOSABLE_RESET_CONFIRMATION = "RESET_DISPOSABLE_RESTAURANT_DATABASE";

export interface ResetGuardEnvironment {
	NODE_ENV?: string;
	RR_DISPOSABLE_DB?: string;
	RR_RESET_CONFIRMATION?: string;
	DB_NAME?: string;
	RR_RESET_DATABASE?: string;
}

export class ResetSafetyError extends Error {
	readonly code = "RESET_SAFETY_REFUSAL";

	constructor(message: string) {
		super(message);
		this.name = "ResetSafetyError";
	}
}

/**
 * Destructive catalog replacement is available only for an explicitly marked
 * disposable development/test database with an exact per-invocation phrase.
 * Production always loses, even if the other flags are present.
 */
export function assertDisposableResetAllowed(environment: ResetGuardEnvironment): void {
	if (environment.NODE_ENV === "production") {
		throw new ResetSafetyError("Database reset is disabled in production.");
	}

	if (environment.NODE_ENV !== "development" && environment.NODE_ENV !== "test") {
		throw new ResetSafetyError("Database reset requires NODE_ENV=development or NODE_ENV=test.");
	}

	if (environment.RR_DISPOSABLE_DB !== "true") {
		throw new ResetSafetyError("Database reset requires RR_DISPOSABLE_DB=true for an isolated disposable database.");
	}

	if (!environment.DB_NAME?.startsWith("rr_disposable_") || environment.RR_RESET_DATABASE !== environment.DB_NAME) {
		throw new ResetSafetyError(
			"Reset requires a database named rr_disposable_* and RR_RESET_DATABASE matching DB_NAME exactly.",
		);
	}

	if (environment.RR_RESET_CONFIRMATION !== DISPOSABLE_RESET_CONFIRMATION) {
		throw new ResetSafetyError(
			`Database reset requires RR_RESET_CONFIRMATION=${DISPOSABLE_RESET_CONFIRMATION} for this invocation.`,
		);
	}
}
