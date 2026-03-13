import { QueryFailedError } from 'typeorm';
import { isDatabaseUnavailableError } from './database-exception.filter';

describe('isDatabaseUnavailableError', () => {
  it('detects sqlite readonly failures caused by a missing backing file', () => {
    const exception = new QueryFailedError(
      'INSERT INTO users(name) VALUES (?)',
      ['Bob'],
      {
        code: 'SQLITE_READONLY',
        message: 'SQLITE_READONLY: attempt to write a readonly database',
      } as Error & { code: string },
    );

    expect(isDatabaseUnavailableError(exception)).toBe(true);
  });

  it('does not misclassify validation or constraint-like query errors', () => {
    const exception = new QueryFailedError(
      'INSERT INTO users(name) VALUES (?)',
      ['Bob'],
      {
        code: 'SQLITE_CONSTRAINT',
        message: 'SQLITE_CONSTRAINT: UNIQUE constraint failed: users.name',
      } as Error & { code: string },
    );

    expect(isDatabaseUnavailableError(exception)).toBe(false);
  });

  it('ignores non-database exceptions', () => {
    expect(isDatabaseUnavailableError(new Error('boom'))).toBe(false);
  });
});
