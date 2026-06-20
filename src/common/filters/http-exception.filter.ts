import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (typeof exceptionResponse === 'string') {
      body.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
      const { message, error: _error, statusCode: _status, ...rest } =
        exceptionResponse as Record<string, unknown>;
      body.message = message ?? 'Internal server error';
      Object.assign(body, rest);
    } else {
      body.message = 'Internal server error';
    }

    if (status === 500) {
      this.logger.error(exception);
    }

    response.status(status).json(body);
  }
}
