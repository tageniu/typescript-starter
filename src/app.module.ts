import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { getTypeOrmConfig } from './database/typeorm.config';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [AppController],
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: getTypeOrmConfig,
    }),
    UsersModule,
    EventsModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class AppModule {}
