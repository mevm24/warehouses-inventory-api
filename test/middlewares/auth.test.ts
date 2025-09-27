import type { NextFunction, Request, Response } from 'express';
import { authMiddleware } from '../../src/middlewares/auth';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() when Authorization header is present', () => {
    mockRequest.headers = {
      authorization: 'Bearer test-token-12345',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header is missing', () => {
    mockRequest.headers = {};

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing Authorization header (use any token for dev)',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when headers object is undefined', () => {
    // Testing edge case where headers is undefined (bypassing type checking for testing error conditions)
    mockRequest.headers = undefined as unknown as Request['headers'];

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing Authorization header (use any token for dev)',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should accept any Bearer token format in development', () => {
    const testCases = [
      'Bearer token',
      'Bearer 123',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'Bearer ',
      'Basic auth-string', // Even non-Bearer tokens pass in dev
      'Some random auth',
    ];

    testCases.forEach((authHeader) => {
      mockRequest.headers = { authorization: authHeader };

      authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      nextFunction = jest.fn(); // Reset for next iteration
    });
  });

  it('should handle case-insensitive header names', () => {
    // Express normalizes headers to lowercase, so we test with lowercase
    mockRequest.headers = {
      authorization: 'Bearer test-token',
    };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should not modify request when authorization passes', () => {
    const originalHeaders = {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    };
    mockRequest.headers = { ...originalHeaders };

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers).toEqual(originalHeaders);
  });

  it('should not throw error on malformed requests', () => {
    const malformedRequests = [
      { headers: null },
      { headers: { authorization: null } },
      { headers: { authorization: undefined } },
      { headers: { authorization: '' } },
      // Testing edge cases with invalid authorization header types (bypassing type checking for testing error conditions)
      { headers: { authorization: 0 as unknown as string } },
      { headers: { authorization: false as unknown as string } },
    ];

    malformedRequests.forEach((request) => {
      expect(() => {
        authMiddleware(request as Request, mockResponse as Response, nextFunction);
      }).not.toThrow();
    });
  });
});
