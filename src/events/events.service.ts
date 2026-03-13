import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import {
  buildOverlappingClusters,
  mergeEventCluster,
} from './event-merge.util';
import { EventEntity } from './event.entity';

export interface MergeAllResult {
  userId: number;
  mergedClusters: number;
  removedEventIds: number[];
  mergedEvents: EventEntity[];
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<EventEntity> {
    this.validateTimeRange(createEventDto.startTime, createEventDto.endTime);

    const invitees = await this.loadInvitees(createEventDto.inviteeIds);
    const event = this.eventsRepository.create({
      description: createEventDto.description?.trim() ?? null,
      endTime: createEventDto.endTime,
      invitees,
      startTime: createEventDto.startTime,
      status: createEventDto.status,
      title: createEventDto.title.trim(),
    });
    const savedEvent = await this.eventsRepository.save(event);

    return this.findById(savedEvent.id);
  }

  async findAll(): Promise<EventEntity[]> {
    const events = await this.eventsRepository.find({
      relations: {
        invitees: true,
      },
    });

    return events.sort((left, right) => left.id - right.id);
  }

  async findById(id: number): Promise<EventEntity> {
    const event = await this.eventsRepository.findOne({
      relations: {
        invitees: true,
      },
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    return event;
  }

  async delete(id: number): Promise<void> {
    const event = await this.findById(id);

    await this.eventsRepository.remove(event);
  }

  async mergeAllForUser(userId: number): Promise<MergeAllResult> {
    const user = await this.usersRepository.findOne({
      relations: {
        events: {
          invitees: true,
        },
      },
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const clustersToMerge = buildOverlappingClusters(user.events).filter(
      (cluster) => cluster.length > 1,
    );

    if (clustersToMerge.length === 0) {
      return {
        mergedClusters: 0,
        mergedEvents: [],
        removedEventIds: [],
        userId,
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const mergedEvents: EventEntity[] = [];
      const removedEventIds: number[] = [];

      for (const cluster of clustersToMerge) {
        const mergedEvent = manager.create(
          EventEntity,
          mergeEventCluster(cluster),
        );
        const savedEvent = await manager.save(EventEntity, mergedEvent);
        const persistedEvent = await manager.findOneOrFail(EventEntity, {
          relations: {
            invitees: true,
          },
          where: { id: savedEvent.id },
        });

        mergedEvents.push(persistedEvent);
        removedEventIds.push(...cluster.map((event) => event.id));
        await manager.remove(EventEntity, cluster);
      }

      return {
        mergedClusters: clustersToMerge.length,
        mergedEvents,
        removedEventIds,
        userId,
      };
    });
  }

  private async loadInvitees(inviteeIds: number[]): Promise<UserEntity[]> {
    const invitees = await this.usersRepository.findBy({
      id: In(inviteeIds),
    });

    if (invitees.length !== inviteeIds.length) {
      const foundIds = new Set(invitees.map((invitee) => invitee.id));
      const missingInviteeIds = inviteeIds.filter((id) => !foundIds.has(id));

      throw new NotFoundException(
        `Invitees not found: ${missingInviteeIds.join(', ')}`,
      );
    }

    return invitees.sort((left, right) => left.id - right.id);
  }

  private validateTimeRange(startTime: Date, endTime: Date) {
    if (startTime.getTime() >= endTime.getTime()) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
  }
}
