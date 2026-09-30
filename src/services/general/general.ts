import { AppError, logger, statusCodes, singleFileUpload, multipleFileUpload } from "../../utils";
import type { UploadFile } from "../../utils";
import axios from "axios";
import { sequelize } from "../../config";
import { pingRedis } from "../../middleware/rateLimiter";

const { INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE } = statusCodes;

class General {
	async testFunction() {
		try {
			const url = "https://jsonplaceholder.typicode.com/users";
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			console.error("Error in testFunction:", error);
			if (error.statusCode) {
				throw new AppError(error.statusCode, error.message);
			}
			throw new AppError(INTERNAL_SERVER_ERROR, error?.message || error);
		}
	}

	async checkReadiness() {
		try {
			await sequelize.authenticate();
			await pingRedis();
		} catch (error) {
			logger.error({ err: error }, "Readiness check failed");
			throw new AppError(SERVICE_UNAVAILABLE, "Service not ready");
		}
	}

	async uploadSinglFile(file: UploadFile) {
		return singleFileUpload(file);
	}

	async uploadMultipleFile(files: UploadFile[]) {
		return multipleFileUpload(files);
	}
}
export { General };
