import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    autoLoadEntities: true,
    database: process.env.DB_PATH ?? 'event-mgmt.sqlite',
    synchronize: true,
    type: 'sqlite',
  };
}
