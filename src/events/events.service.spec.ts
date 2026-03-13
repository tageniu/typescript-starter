import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { EventStatus } from './event-status.enum';
import { EventEntity } from './event.entity';
import { EventsService } from './events.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: MockRepository<EventEntity>;
  let usersRepository: MockRepository<UserEntity>;

  beforeEach(async () => {
    eventsRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      save: jest.fn(),
    };
    usersRepository = {
      findBy: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(EventEntity),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: usersRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('lists events ordered by id', async () => {
    const alice = { id: 1, name: 'Alice' } as UserEntity;

    eventsRepository.find?.mockResolvedValue([
      {
        createdAt: new Date(),
        description: null,
        endTime: new Date('2026-03-11T17:00:00.000Z'),
        id: 2,
        invitees: [alice],
        startTime: new Date('2026-03-11T16:00:00.000Z'),
        status: EventStatus.TODO,
        title: 'Later',
        updatedAt: new Date(),
      },
      {
        createdAt: new Date(),
        description: null,
        endTime: new Date('2026-03-11T15:00:00.000Z'),
        id: 1,
        invitees: [alice],
        startTime: new Date('2026-03-11T14:00:00.000Z'),
        status: EventStatus.TODO,
        title: 'Sooner',
        updatedAt: new Date(),
      },
    ]);

    await expect(service.findAll()).resolves.toMatchObject([
      { id: 1, title: 'Sooner' },
      { id: 2, title: 'Later' },
    ]);
  });

  it('creates an event when invitees exist and the time range is valid', async () => {
    const invitee = { id: 1, name: 'Alice' } as UserEntity;
    const persistedEvent = {
      createdAt: new Date('2026-03-11T13:00:00.000Z'),
      description: 'Review the release plan',
      endTime: new Date('2026-03-11T15:00:00.000Z'),
      id: 5,
      invitees: [invitee],
      startTime: new Date('2026-03-11T14:00:00.000Z'),
      status: EventStatus.TODO,
      title: 'Planning',
      updatedAt: new Date('2026-03-11T13:00:00.000Z'),
    } as EventEntity;

    usersRepository.findBy?.mockResolvedValue([invitee]);
    eventsRepository.create?.mockReturnValue(persistedEvent);
    eventsRepository.save?.mockResolvedValue({ id: 5 });
    eventsRepository.findOne?.mockResolvedValue(persistedEvent);

    await expect(
      service.create({
        description: '  Review the release plan  ',
        endTime: new Date('2026-03-11T15:00:00.000Z'),
        inviteeIds: [1],
        startTime: new Date('2026-03-11T14:00:00.000Z'),
        status: EventStatus.TODO,
        title: ' Planning ',
      }),
    ).resolves.toEqual(persistedEvent);
    expect(eventsRepository.create).toHaveBeenCalledWith({
      description: 'Review the release plan',
      endTime: new Date('2026-03-11T15:00:00.000Z'),
      invitees: [invitee],
      startTime: new Date('2026-03-11T14:00:00.000Z'),
      status: EventStatus.TODO,
      title: 'Planning',
    });
  });

  it('rejects invalid time ranges', async () => {
    await expect(
      service.create({
        endTime: new Date('2026-03-11T14:00:00.000Z'),
        inviteeIds: [1],
        startTime: new Date('2026-03-11T14:00:00.000Z'),
        status: EventStatus.TODO,
        title: 'Invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing invitees', async () => {
    usersRepository.findBy?.mockResolvedValue([]);

    await expect(
      service.create({
        endTime: new Date('2026-03-11T15:00:00.000Z'),
        inviteeIds: [123],
        startTime: new Date('2026-03-11T14:00:00.000Z'),
        status: EventStatus.TODO,
        title: 'Planning',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when an event does not exist', async () => {
    eventsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findById(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an existing event', async () => {
    const event = {
      createdAt: new Date(),
      endTime: new Date('2026-03-11T15:00:00.000Z'),
      id: 7,
      invitees: [],
      startTime: new Date('2026-03-11T14:00:00.000Z'),
      status: EventStatus.TODO,
      title: 'Planning',
      updatedAt: new Date(),
    } as EventEntity;

    eventsRepository.findOne?.mockResolvedValue(event);
    eventsRepository.remove?.mockResolvedValue(event);

    await expect(service.delete(7)).resolves.toBeUndefined();
    expect(eventsRepository.remove).toHaveBeenCalledWith(event);
  });

  it('rejects merge-all when the user does not exist', async () => {
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(service.mergeAllForUser(55)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
