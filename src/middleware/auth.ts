import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/errorHandler";
import { getOrThrow } from "../utils/helper";
import { statusCodes } from "../utils/status-codes";

const { UNAUTHORIZED } = statusCodes;

type AuthUser = JwtPayload & { id: string };

// Makes `req.user` typed everywhere this module is (transitively) imported.
// Declaration merging into Express's global namespace is the only supported way.
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

/**
 * Requires `Authorization: Bearer <jwt>` signed HS256 with JWT_SECRET and a
 * `sub` claim; sets `req.user` (`id` = `sub`, plus the rest of the claims).
 * Missing/invalid/expired token -> 401. Missing JWT_SECRET is a server
 * misconfiguration, so it throws (500) instead of masquerading as a 401.
 */
const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
	const [scheme, token] = (req.headers.authorization ?? "").split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return next(new AppError(UNAUTHORIZED, "Missing or malformed Authorization header"));
	}

	const secret = getOrThrow("JWT_SECRET");
	try {
		const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
		if (typeof payload === "string" || !payload.sub) {
			return next(new AppError(UNAUTHORIZED, "Invalid token"));
		}
		req.user = { ...payload, id: payload.sub };
		return next();
	} catch {
		return next(new AppError(UNAUTHORIZED, "Invalid or expired token"));
	}
};

export { authenticate };
export type { AuthUser };
