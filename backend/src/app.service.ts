import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      service: 'SIGO-Dental API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
