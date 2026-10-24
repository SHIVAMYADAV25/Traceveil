export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = "Please sign in to continue.") =>
  new AppError(401, "unauthorized", message);
export const forbidden = (code = "forbidden", message = "You do not have permission to do that.") =>
  new AppError(403, code, message);
export const notFound = (message = "Not found.") => new AppError(404, "not_found", message);
export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);
export const tooMany = (code: string, message: string, details?: unknown) =>
  new AppError(429, code, message, details);
