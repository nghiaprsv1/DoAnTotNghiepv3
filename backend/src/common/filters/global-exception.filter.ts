import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  data: null;
  success: false;
  statusCode: number;
  message: string;
  errors?: unknown;
}

/**
 * Converts every thrown error into the same `ApiResponse`-ish shape so the
 * frontend can handle it uniformly.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: unknown; error?: unknown };
        if (Array.isArray(b.message)) {
          message = (b.message[0] as string) ?? 'Validation failed';
          errors = b.message;
        } else if (typeof b.message === 'string') {
          message = b.message;
        }
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query failed';
      this.logger.error(exception.message, exception.stack);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    const body: ErrorBody = {
      data: null,
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
    };

    res.status(status).json(body);
  }
}
