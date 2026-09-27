// Unit tests must never inherit the developer's database credentials.
// The existing repository layer is mocked in API tests; this intentionally
// unreachable port also makes an accidental real connection fail closed.
Object.assign(process.env, {
	NODE_ENV: "test",
	DB_HOST: "127.0.0.1",
	DB_PORT: "1",
	DB_USER: "rr_unit_test",
	DB_PASSWORD: "TEST_FIXTURE_NOT_A_CREDENTIAL",
	DB_NAME: "rr_unit_test_disposable",
});
