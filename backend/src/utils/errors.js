class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  console.error(`[ERROR] ${err.stack || err.message}`);

  if (err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  res.status(statusCode).json({
    success: false,
    code,
    message: process.env.NODE_ENV === 'production' && !err.isOperational ? 'Internal server error' : message,
  });
};

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  errorHandler,
};