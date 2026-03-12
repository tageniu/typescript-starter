import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/user.entity';
import { EventEntity } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { UserEventsController } from './user-events.controller';

@Module({
  controllers: [EventsController, UserEventsController],
  imports: [TypeOrmModule.forFeature([EventEntity, UserEntity])],
  providers: [EventsService],
})
export class EventsModule {}
