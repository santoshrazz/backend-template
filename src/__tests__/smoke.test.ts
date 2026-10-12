import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// db.ts reads these at import time; nothing here actually connects.
Object.assign(process.env, {
	DB_NAME: "test",
	DB_USERNAME: "test",
	DB_PASSWORD: "test",
	DB_HOST: "127.0.0.1",
	LOG_LEVEL: "silent",
});

let server: http.Server;
let base: string;

before(async () => {
	const { default: app } = await import("../app");
	server = http.createServer(app).listen(0);
	await new Promise(resolve => server.once("listening", resolve));
	base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

after(() => {
	server.close();
});

test("GET /health is up", async () => {
	const res = await fetch(`${base}/health`);
	assert.equal(res.status, 200);
	const body = (await res.json()) as { status: string };
	assert.equal(body.status, "ok");
});

// Test creds never match a real DB, so /ready fails: checks the 503 and that the
// error handler returns the standard shape without leaking the underlying cause.
test("GET /ready returns a generic 503 when the DB is unreachable", async () => {
	const res = await fetch(`${base}/ready`);
	assert.equal(res.status, 503);
	const body = (await res.json()) as { success: boolean; statusCode: number; message: string };
	assert.equal(body.success, false);
	assert.equal(body.statusCode, 503);
	assert.equal(body.message, "Internal Server Error");
});
