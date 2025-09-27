import { ValidationError, NotFoundError, ConflictError, InternalServerError } from '../../src/errors/customErrors';

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    it('should create ValidationError with correct message and name', () => {
      const message = 'Invalid input provided';
      const error = new ValidationError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('ValidationError');
    });

    it('should maintain error stack trace', () => {
      const error = new ValidationError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('should be throwable and catchable', () => {
      const message = 'Validation failed';

      expect(() => {
        throw new ValidationError(message);
      }).toThrow(ValidationError);

      expect(() => {
        throw new ValidationError(message);
      }).toThrow(message);
    });

    it('should work with instanceof checks', () => {
      const error = new ValidationError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof NotFoundError).toBe(false);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with correct message and name', () => {
      const message = 'Resource not found';
      const error = new NotFoundError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('NotFoundError');
    });

    it('should maintain error stack trace', () => {
      const error = new NotFoundError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('NotFoundError');
    });

    it('should be throwable and catchable', () => {
      const message = 'Item not found';

      expect(() => {
        throw new NotFoundError(message);
      }).toThrow(NotFoundError);

      expect(() => {
        throw new NotFoundError(message);
      }).toThrow(message);
    });

    it('should work with instanceof checks', () => {
      const error = new NotFoundError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
      expect(error instanceof ValidationError).toBe(false);
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with correct message and name', () => {
      const message = 'Resource conflict detected';
      const error = new ConflictError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('ConflictError');
    });

    it('should maintain error stack trace', () => {
      const error = new ConflictError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConflictError');
    });

    it('should be throwable and catchable', () => {
      const message = 'Conflict occurred';

      expect(() => {
        throw new ConflictError(message);
      }).toThrow(ConflictError);

      expect(() => {
        throw new ConflictError(message);
      }).toThrow(message);
    });

    it('should work with instanceof checks', () => {
      const error = new ConflictError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
      expect(error instanceof ValidationError).toBe(false);
      expect(error instanceof NotFoundError).toBe(false);
    });
  });

  describe('InternalServerError', () => {
    it('should create InternalServerError with correct message and name', () => {
      const message = 'Internal server error occurred';
      const error = new InternalServerError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('InternalServerError');
    });

    it('should maintain error stack trace', () => {
      const error = new InternalServerError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('InternalServerError');
    });

    it('should be throwable and catchable', () => {
      const message = 'Server error';

      expect(() => {
        throw new InternalServerError(message);
      }).toThrow(InternalServerError);

      expect(() => {
        throw new InternalServerError(message);
      }).toThrow(message);
    });

    it('should work with instanceof checks', () => {
      const error = new InternalServerError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof InternalServerError).toBe(true);
      expect(error instanceof ValidationError).toBe(false);
      expect(error instanceof NotFoundError).toBe(false);
      expect(error instanceof ConflictError).toBe(false);
    });
  });

  describe('Error inheritance and polymorphism', () => {
    it('should allow catching all custom errors as Error', () => {
      const errors = [
        new ValidationError('Validation failed'),
        new NotFoundError('Not found'),
        new ConflictError('Conflict'),
        new InternalServerError('Server error')
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
      });
    });

    it('should differentiate between error types', () => {
      const validationError = new ValidationError('Validation failed');
      const notFoundError = new NotFoundError('Not found');
      const conflictError = new ConflictError('Conflict');
      const serverError = new InternalServerError('Server error');

      // Each error should only be instance of its own type (and Error)
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof NotFoundError).toBe(false);
      expect(validationError instanceof ConflictError).toBe(false);
      expect(validationError instanceof InternalServerError).toBe(false);

      expect(notFoundError instanceof NotFoundError).toBe(true);
      expect(notFoundError instanceof ValidationError).toBe(false);
      expect(notFoundError instanceof ConflictError).toBe(false);
      expect(notFoundError instanceof InternalServerError).toBe(false);

      expect(conflictError instanceof ConflictError).toBe(true);
      expect(conflictError instanceof ValidationError).toBe(false);
      expect(conflictError instanceof NotFoundError).toBe(false);
      expect(conflictError instanceof InternalServerError).toBe(false);

      expect(serverError instanceof InternalServerError).toBe(true);
      expect(serverError instanceof ValidationError).toBe(false);
      expect(serverError instanceof NotFoundError).toBe(false);
      expect(serverError instanceof ConflictError).toBe(false);
    });

    it('should work in try-catch blocks with specific error handling', () => {
      const testFunction = (errorType: string) => {
        switch (errorType) {
          case 'validation':
            throw new ValidationError('Validation failed');
          case 'notfound':
            throw new NotFoundError('Not found');
          case 'conflict':
            throw new ConflictError('Conflict');
          case 'server':
            throw new InternalServerError('Server error');
          default:
            throw new Error('Unknown error');
        }
      };

      // Test ValidationError handling
      try {
        testFunction('validation');
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        expect((error as ValidationError).message).toBe('Validation failed');
      }

      // Test NotFoundError handling
      try {
        testFunction('notfound');
      } catch (error) {
        expect(error instanceof NotFoundError).toBe(true);
        expect((error as NotFoundError).message).toBe('Not found');
      }

      // Test ConflictError handling
      try {
        testFunction('conflict');
      } catch (error) {
        expect(error instanceof ConflictError).toBe(true);
        expect((error as ConflictError).message).toBe('Conflict');
      }

      // Test InternalServerError handling
      try {
        testFunction('server');
      } catch (error) {
        expect(error instanceof InternalServerError).toBe(true);
        expect((error as InternalServerError).message).toBe('Server error');
      }
    });
  });

  describe('Error messages', () => {
    it('should handle empty error messages', () => {
      const errors = [
        new ValidationError(''),
        new NotFoundError(''),
        new ConflictError(''),
        new InternalServerError('')
      ];

      errors.forEach(error => {
        expect(error.message).toBe('');
        expect(error.name).toBeDefined();
      });
    });

    it('should handle multiline error messages', () => {
      const multilineMessage = 'Error occurred\nOn line 2\nWith details';
      const error = new ValidationError(multilineMessage);

      expect(error.message).toBe(multilineMessage);
      expect(error.message).toContain('\n');
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = 'Error with "quotes" and \'apostrophes\' and symbols: @#$%^&*()';
      const error = new NotFoundError(specialMessage);

      expect(error.message).toBe(specialMessage);
    });
  });
});