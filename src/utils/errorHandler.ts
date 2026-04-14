class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (statusCode: number, message: string): never => {
  throw new AppError(statusCode, message);
};

export default AppError;
