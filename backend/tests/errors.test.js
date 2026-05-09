const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  errorHandler,
} = require('../src/utils/errors');

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with errors array', () => {
      const errors = [{ field: 'name', message: 'Name is required' }];
      const error = new ValidationError('Validation failed', errors);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError', () => {
      const error = new NotFoundError('Patient not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Patient not found');
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
    });
  });

  describe('errorHandler', () => {
    it('should handle operational errors correctly', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        headersSent: false,
      };
      const next = jest.fn();

      const error = new AppError('Test error', 400, 'TEST_ERROR');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 'TEST_ERROR',
        message: 'Test error',
      });
    });

    it('should handle non-operational errors with generic message in production', () => {
      const req = { app: { get: jest.fn().mockReturnValue('production') } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        headersSent: false,
      };
      const next = jest.fn();

      const error = new Error('Something went wrong');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });
  });
});