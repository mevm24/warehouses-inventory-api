export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}

import type { Response } from 'express';

export function handleError(error: unknown, res: Response, defaultMessage: string = 'An error occurred'): Response {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: error.message });
  }

  if (error instanceof ConflictError) {
    return res.status(409).json({ message: error.message });
  }

  if (error instanceof InternalServerError) {
    return res.status(500).json({ message: error.message });
  }

  return res.status(500).json({ message: defaultMessage });
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function handleTransferError(error: unknown, res: Response): Response {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(400).json({
    message: extractErrorMessage(error) || 'Failed to process transfer.',
  });
}
