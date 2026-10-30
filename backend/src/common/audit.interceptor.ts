import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

const ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// RNF-06: log inmutable de auditoría para cada acción de escritura (CRUD).
// Registra quién, qué acción, sobre qué recurso, con timestamp e IP de origen.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const action = ACTION[req.method];

    return next.handle().pipe(
      tap(() => {
        if (!action) return; // solo escrituras
        const url: string = req.originalUrl ?? req.url ?? '';
        const path = url.split('?')[0];
        const segments = path.split('/').filter(Boolean); // ['api','patients',...]
        const entity = segments[1] ?? 'desconocido';
        const entityId = segments[2];

        // No bloquea la respuesta si el log falla.
        this.prisma.auditLog
          .create({
            data: {
              userId: req.user?.id,
              action,
              entity,
              entityId,
              ipAddress: req.ip ?? req.socket?.remoteAddress,
              metadata: { method: req.method, path },
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
