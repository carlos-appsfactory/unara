import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common'
import { QueryFailedError } from 'typeorm'

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
    private readonly logger: Logger
    
    constructor(contextName: string) {
        this.logger = new Logger(contextName)
    }

    catch(exception: QueryFailedError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest<Request>();
        const code = (exception as any).code || (exception.driverError as any)?.code;

        let message = "Unexpected database error, check server logs";
        let status = HttpStatus.INTERNAL_SERVER_ERROR;

        switch (code) {
            case '23505':
                const table = (exception as any).table || 'unknown table';
                const detail = (exception as any).detail || '';
                const match = detail.match(/\((.+)\)=\(.+\)/);
                const field = match ? match[1] : 'unknown field';

                message = `El valor del campo '${field}' en la tabla '${table}' ya existe`;
                status = HttpStatus.CONFLICT;
                break;
        }

        this.logger.error(
            `[${request.method} ${decodeURIComponent(request.url)}] ${message} (code: ${code})\n${exception.stack}`
        );

        return response.status(status).json({
            message,
            code,
        });
    }
}