export class DomainValidationError extends Error {
  constructor(public override message: string, public statusCode: number = 422) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export class ConflictError extends Error {
  constructor(public override message: string, public statusCode: number = 409) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(public override message: string, public statusCode: number = 404) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(public override message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  constructor(public override message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
