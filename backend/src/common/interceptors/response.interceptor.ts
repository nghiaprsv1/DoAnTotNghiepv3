import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/api-response.type';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

/**
 * Wraps every controller return value into the shared `ApiResponse<T>` shape
 * the frontend expects.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const httpCtx = context.switchToHttp();
    const res = httpCtx.getResponse<Response>();
    const customMessage =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_KEY,
        context.getHandler(),
      ) ?? 'OK';

    return next.handle().pipe(
      map((data) => ({
        data: data as T,
        message: customMessage,
        success: true,
        statusCode: res.statusCode,
      })),
    );
  }
}
