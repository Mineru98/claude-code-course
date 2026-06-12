export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', 400, message)
  }
}
export class AuthError extends AppError {
  constructor(message: string) {
    super('AUTH', 401, message)
  }
}
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', 403, message)
  }
}
export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', 404, message)
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message)
  }
}
