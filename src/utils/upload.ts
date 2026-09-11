import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextFunction, Request, Response } from "express";
import { getOrThrow } from "./helper";
import AppError from "./errorHandler";
import { statusCodes } from "./status-codes";

interface UploadFile {
	buffer: Buffer;
	originalname: string;
	mimetype: string;
}

// Built lazily on first use (not at import time) so starting the app
// doesn't require AWS_* env vars unless an upload/file route is actually hit.
let s3: { client: S3Client; bucket: string } | undefined;

const getS3 = () => {
	if (!s3) {
		s3 = {
			bucket: getOrThrow("AWS_S3_BUCKET"),
			client: new S3Client({
				region: getOrThrow("AWS_REGION"),
				credentials: {
					accessKeyId: getOrThrow("AWS_ACCESS_KEY_ID"),
					secretAccessKey: getOrThrow("AWS_SECRET_ACCESS_KEY"),
				},
			}),
		};
	}
	return s3;
};

const buildFileUrl = (key: string) =>
	`${getOrThrow("BACKEND_BASE_URL").replace(/\/$/, "")}/files/${key}`;

const uploadFile = async (file: UploadFile): Promise<string> => {
	const { client, bucket } = getS3();
	const key = `${randomUUID()}${path.extname(file.originalname)}`;

	try {
		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
			}),
		);
	} catch (error: any) {
		throw new AppError(
			statusCodes.INTERNAL_SERVER_ERROR,
			`Failed to upload file: ${error?.message || error}`,
		);
	}

	return buildFileUrl(key);
};

const singleFileUpload = (file: UploadFile): Promise<string> => uploadFile(file);

const multipleFileUpload = (files: UploadFile[]): Promise<string[]> =>
	Promise.all(files.map(uploadFile));

// Registered directly on the app (see app.ts), not routed through
// controllers/dispatcher — it streams the file body and sets its own
// headers instead of returning JSON.
const serveFile = async (req: Request, res: Response, next: NextFunction) => {
	const key = req.params.key as string;
	let object;

	try {
		const { client, bucket } = getS3();
		object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
	} catch (error: any) {
		if (error.name === "NoSuchKey") {
			return next(new AppError(statusCodes.NOT_FOUND, "File not found"));
		}
		return next(
			new AppError(
				statusCodes.INTERNAL_SERVER_ERROR,
				error?.message || "Failed to fetch file",
			),
		);
	}

	res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
	if (object.ContentLength) res.setHeader("Content-Length", object.ContentLength.toString());

	const body = object.Body as NodeJS.ReadableStream;
	body.pipe(res).on("error", next);
};

export { singleFileUpload, multipleFileUpload, serveFile, UploadFile };
