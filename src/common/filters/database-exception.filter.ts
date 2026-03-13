import { ArgumentsHost, Catch, HttpStatus, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

const SQLITE_UNAVAILABLE_CODE_PREFIXES = [
  'SQLITE_BUSY',
  'SQLITE_CANTOPEN',
  'SQLITE_IOERR',
  'SQLITE_LOCKED',
  'SQLITE_READONLY',
];

const SQLITE_UNAVAILABLE_CODES = new Set([
  'SQLITE_CORRUPT',
  'SQLITE_FULL',
  'SQLITE_NOTADB',
]);

const SQLITE_UNAVAILABLE_MESSAGE_PATTERN =
  /attempt to write a readonly database|database (?:disk image is malformed|is locked|schema is locked)|disk i\/o error|unable to open database file/i;

export function isDatabaseUnavailableError(exception: unknown): boolean {
  if (!(exception instanceof QueryFailedError)) {
    return false;
  }

  const driverError = exception.driverError as
    | {
        code?: string;
        message?: string;
      }
    | undefined;
  const code = driverError?.code;

  if (typeof code === 'string') {
    if (SQLITE_UNAVAILABLE_CODES.has(code)) {
      return true;
    }

    if (
      SQLITE_UNAVAILABLE_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))
    ) {
      return true;
    }
  }

  const message =
    typeof driverError?.message === 'string'
      ? driverError.message
      : exception.message;

  return SQLITE_UNAVAILABLE_MESSAGE_PATTERN.test(message);
}

@Catch()
@Injectable()
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http' && isDatabaseUnavailableError(exception)) {
      const { httpAdapter } = this.adapterHost;
      const http = host.switchToHttp();
      const request = http.getRequest<{ url?: string }>();

      httpAdapter.reply(
        http.getResponse(),
        {
          error: 'Service Unavailable',
          message: 'Database temporarily unavailable',
          path: request.url ?? undefined,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      return;
    }

    super.catch(exception, host);
  }
}
