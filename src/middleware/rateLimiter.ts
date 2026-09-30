import { rateLimit, type Options, type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import AppError from "../utils/errorHandler";
import { statusCodes } from "../utils/status-codes";

const { TOO_MANY_REQUESTS } = statusCodes;

const isProduction = () => process.env.NODE_ENV === "production";

// ioredis emits connection failures as an "error" event, separate from
// `connect()` rejecting — an EventEmitter with no "error" listener crashes
// the process on that event, so the listener must be attached before
// `connect()` is ever called, not just caught around the await.
const connectRedis = async (url: string): Promise<Redis> => {
	const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
	client.on("error", err => logger.debug({ err }, "Redis client error"));
	try {
		await client.connect();
		return client;
	} catch (error) {
		client.disconnect();
		throw error;
	}
};

/**
 * Startup guard (called once from the primary before workers fork): in
 * production, REDIS_URL set but unreachable is a hard failure. Without it each
 * worker would silently fall back to its own in-memory counters, multiplying
 * the effective limit by the worker count.
 */
const assertRedisReachable = async () => {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl || !isProduction()) return;
	await (await connectRedis(redisUrl)).quit();
};

let redisClient: Redis | undefined;

/** Readiness probe: resolves if Redis isn't in use, rejects if it's in use but down. */
const pingRedis = async () => {
	if (redisClient) await redisClient.ping();
};

/**
 * Resolved once, lazily, on first request: a Redis-backed store if
 * REDIS_URL is set and reachable, otherwise express-rate-limit's built-in
 * in-memory store. Logs which one ends up in use.
 */
let storePromise: Promise<Store | undefined> | undefined;

const resolveStore = (): Promise<Store | undefined> => {
	storePromise ??= (async () => {
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) {
			(isProduction() ? logger.warn : logger.info).call(
				logger,
				"Rate limiter using memory-storage (REDIS_URL not set); limits are per worker process",
			);
			return undefined;
		}

		try {
			const client = await connectRedis(redisUrl);
			redisClient = client;
			logger.info("Rate limiter using redis");
			return new RedisStore({
				sendCommand: (...args: string[]) => {
					const [command, ...rest] = args;
					return client.call(command, ...rest) as Promise<never>;
				},
			});
		} catch (error) {
			(isProduction() ? logger.error : logger.warn).call(
				logger,
				{ err: error },
				"Redis unavailable, rate limiter falling back to per-worker memory-storage",
			);
			return undefined;
		}
	})();
	return storePromise;
};

const rateLimitExceeded = (req: Request, res: Response, next: NextFunction) => {
	next(new AppError(TOO_MANY_REQUESTS, "Too many requests, please try again later."));
};

// Builds a rate limiter whose store isn't known until `resolveStore()`
// settles; every request awaits that resolution once, then reuses the same
// (memoized) express-rate-limit instance from then on.
const buildLimiter = (options: Partial<Options>) => {
	let limiter: ReturnType<typeof rateLimit> | undefined;
	let building: Promise<unknown> | undefined;

	return async (req: Request, res: Response, next: NextFunction) => {
		if (!limiter) {
			building ??= resolveStore().then(store => {
				limiter = rateLimit({ ...options, store });
			});
			await building;
		}
		limiter!(req, res, next);
	};
};

const sharedOptions: Partial<Options> = {
	standardHeaders: true,
	legacyHeaders: false,
	handler: rateLimitExceeded,
};

// Brute-force protection for login/register/etc. — tighten or loosen per route.
const authLimiter = buildLimiter({
	...sharedOptions,
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 5,
});

// General API traffic.
const apiLimiter = buildLimiter({
	...sharedOptions,
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100,
});

export { authLimiter, apiLimiter, assertRedisReachable, pingRedis };
