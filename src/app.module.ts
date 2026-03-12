import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from './database/typeorm.config';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [AppController],
  imports: [
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    UsersModule,
    EventsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
