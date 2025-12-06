import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError } from '../src/errors.js';

describe('error classes', () => {
  describe('AppError', () => {
    it('creates error with all properties', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400, { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('AppError');
    });

    it('defaults statusCode to 500', () => {
      const error = new AppError('Test', 'TEST');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('NotFoundError', () => {
    it('creates 404 error with resource info', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe('User not found: 123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.context).toEqual({ resource: 'User', id: '123' });
    });
  });

  describe('ValidationError', () => {
    it('creates 400 error with details', () => {
      const details = { field: 'email', error: 'invalid' };
      const error = new ValidationError('Invalid input', details);

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ details });
    });
  });
});
