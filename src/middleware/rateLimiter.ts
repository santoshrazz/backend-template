import { rateLimit, type Options, type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import AppError from "../utils/errorHandler";
import { statusCodes } from "../utils/status-codes";

const { TOO_MANY_REQUESTS } = statusCodes;

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
			logger.info("Rate limiter using memory-storage (REDIS_URL not set)");
			return undefined;
		}

		const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
		// ioredis emits connection failures as an "error" event, separate from
		// `connect()` rejecting — an EventEmitter with no "error" listener
		// crashes the process on that event, so this must be attached before
		// `connect()` is ever called, not just caught around the await below.
		client.on("error", err => logger.debug({ err }, "Redis client error"));

		try {
			await client.connect();
			logger.info("Rate limiter using redis");
			return new RedisStore({
				sendCommand: (...args: string[]) => {
					const [command, ...rest] = args;
					return client.call(command, ...rest) as Promise<never>;
				},
			});
		} catch (error) {
			logger.warn(
				{ err: error },
				"Redis unavailable, rate limiter falling back to memory-storage",
			);
			client.disconnect();
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

export { authLimiter, apiLimiter };
