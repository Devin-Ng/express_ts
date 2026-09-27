import {
	assertDisposableResetAllowed,
	DISPOSABLE_RESET_CONFIRMATION,
	type ResetGuardEnvironment,
} from "@/database/resetSafety";

const allowed: ResetGuardEnvironment = {
	NODE_ENV: "development",
	RR_DISPOSABLE_DB: "true",
	RR_RESET_CONFIRMATION: DISPOSABLE_RESET_CONFIRMATION,
	DB_NAME: "rr_disposable_p0_test",
	RR_RESET_DATABASE: "rr_disposable_p0_test",
};

describe("disposable database reset safety", () => {
	it("allows an explicitly confirmed disposable development reset", () => {
		expect(() => assertDisposableResetAllowed(allowed)).not.toThrow();
	});

	it("allows an explicitly confirmed disposable test reset", () => {
		expect(() => assertDisposableResetAllowed({ ...allowed, NODE_ENV: "test" })).not.toThrow();
	});

	it("refuses production even when both reset confirmations are present", () => {
		expect(() => assertDisposableResetAllowed({ ...allowed, NODE_ENV: "production" })).toThrowError(
			expect.objectContaining({ code: "RESET_SAFETY_REFUSAL" }),
		);
	});

	it.each([
		["missing disposable marker", { ...allowed, RR_DISPOSABLE_DB: undefined }],
		["mistyped disposable marker", { ...allowed, RR_DISPOSABLE_DB: "TRUE" }],
		["missing exact confirmation", { ...allowed, RR_RESET_CONFIRMATION: undefined }],
		["mistyped exact confirmation", { ...allowed, RR_RESET_CONFIRMATION: "yes" }],
		["unsupported environment", { ...allowed, NODE_ENV: undefined }],
		["missing target", { ...allowed, DB_NAME: undefined }],
		["ordinary database", { ...allowed, DB_NAME: "restaurant", RR_RESET_DATABASE: "restaurant" }],
		["mismatched target confirmation", { ...allowed, RR_RESET_DATABASE: "rr_disposable_other" }],
	] as Array<
		[string, ResetGuardEnvironment]
	>)("refuses %s", (_description: string, environment: ResetGuardEnvironment) => {
		expect(() => assertDisposableResetAllowed(environment)).toThrowError(
			expect.objectContaining({ code: "RESET_SAFETY_REFUSAL" }),
		);
	});
});
