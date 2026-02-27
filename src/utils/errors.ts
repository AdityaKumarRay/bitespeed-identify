/**
 * Custom application errors with HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found") {
    super(message, 404);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, false);
  }
}
