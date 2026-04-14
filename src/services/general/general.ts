import { AppError, statusCodes } from "../../utils";
import axios from "axios";

const { INTERNAL_SERVER_ERROR } = statusCodes;

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
            throw new AppError(INTERNAL_SERVER_ERROR, "An unexpected error occurred in testFunction");
        }
    }
}
export { General };