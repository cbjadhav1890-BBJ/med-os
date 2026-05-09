const { validate, patientSchema, loginSchema } = require('../src/utils/validator');
const { ValidationError } = require('../src/utils/errors');

describe('Validator', () => {
  describe('patientSchema', () => {
    const middleware = validate(patientSchema);

    it('should pass with valid data', () => {
      const req = { body: { name: 'John Doe', phone: '9876543210', age: 30 } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with missing required fields', () => {
      const req = { body: { name: 'John' } };
      const res = {};
      const next = jest.fn();
      expect(() => middleware(req, res, next)).toThrow(ValidationError);
    });

    it('should fail with invalid email', () => {
      const req = { body: { name: 'John', phone: '9876543210', email: 'invalid-email' } };
      const res = {};
      const next = jest.fn();
      expect(() => middleware(req, res, next)).toThrow(ValidationError);
    });

    it('should fail with invalid phone', () => {
      const req = { body: { name: 'John', phone: '123' } };
      const res = {};
      const next = jest.fn();
      expect(() => middleware(req, res, next)).toThrow(ValidationError);
    });
  });

  describe('loginSchema', () => {
    const middleware = validate(loginSchema);

    it('should pass with valid credentials', () => {
      const req = { body: { username: 'admin', password: 'admin123' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with missing username', () => {
      const req = { body: { password: 'admin123' } };
      const res = {};
      expect(() => middleware(req, res, () => {})).toThrow(ValidationError);
    });
  });
});