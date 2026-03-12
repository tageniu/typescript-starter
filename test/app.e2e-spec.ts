import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

interface UserEventSummary {
  endTime: string;
  id: number;
  startTime: string;
  status: string;
  title: string;
}

interface UserResponse {
  events: UserEventSummary[];
  id: number;
  name: string;
}

interface InviteeResponse {
  id: number;
  name: string;
}

interface EventResponse {
  createdAt: string;
  description: string | null;
  endTime: string;
  id: number;
  invitees: InviteeResponse[];
  startTime: string;
  status: string;
  title: string;
  updatedAt: string;
}

interface MergeAllResponse {
  mergedClusters: number;
  mergedEvents: EventResponse[];
  removedEventIds: number[];
  userId: number;
}

interface CreateEventPayload {
  description?: string;
  endTime: string;
  inviteeIds: number[];
  startTime: string;
  status: string;
  title: string;
}

describe('Event Management (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DB_PATH = ':memory:';

    const appModule = (await import(
      '../src/app.module'
    )) as typeof import('../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [appModule.AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DB_PATH;
  });

  async function createUser(name: string): Promise<UserResponse> {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name })
      .expect(201);

    return response.body as UserResponse;
  }

  async function listUsers(): Promise<UserResponse[]> {
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    return response.body as UserResponse[];
  }

  async function createEvent(
    payload: CreateEventPayload,
  ): Promise<EventResponse> {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send(payload)
      .expect(201);

    return response.body as EventResponse;
  }

  async function listEvents(): Promise<EventResponse[]> {
    const response = await request(app.getHttpServer())
      .get('/events')
      .expect(200);

    return response.body as EventResponse[];
  }

  async function getUser(userId: number): Promise<UserResponse> {
    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .expect(200);

    return response.body as UserResponse;
  }

  async function deleteUser(userId: number): Promise<void> {
    await request(app.getHttpServer()).delete(`/users/${userId}`).expect(204);
  }

  async function getEvent(eventId: number): Promise<EventResponse> {
    const response = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .expect(200);

    return response.body as EventResponse;
  }

  async function mergeAll(userId: number): Promise<MergeAllResponse> {
    const response = await request(app.getHttpServer())
      .post(`/users/${userId}/merge-all`)
      .expect(201);

    return response.body as MergeAllResponse;
  }

  it('returns hello world on the root route', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('creates, fetches, and deletes an event', async () => {
    const user = await createUser('Alice');
    const event = await createEvent({
      description: 'Review API contracts',
      endTime: '2026-03-11T15:00:00.000Z',
      inviteeIds: [user.id],
      startTime: '2026-03-11T14:00:00.000Z',
      status: 'TODO',
      title: 'Design Review',
    });

    expect(event).toMatchObject({
      description: 'Review API contracts',
      invitees: [{ id: user.id, name: 'Alice' }],
      status: 'TODO',
      title: 'Design Review',
    });

    const fetchedEvent = await getEvent(event.id);
    expect(fetchedEvent.id).toBe(event.id);
    expect(fetchedEvent.startTime).toBe('2026-03-11T14:00:00.000Z');
    await expect(listUsers()).resolves.toEqual([
      expect.objectContaining({
        id: user.id,
        name: 'Alice',
      }),
    ]);
    await expect(listEvents()).resolves.toEqual([
      expect.objectContaining({
        id: event.id,
        title: 'Design Review',
      }),
    ]);

    await request(app.getHttpServer())
      .delete(`/events/${event.id}`)
      .expect(204);

    await request(app.getHttpServer()).get(`/events/${event.id}`).expect(404);
  });

  it('deletes a user and removes them from event invitees', async () => {
    const alice = await createUser('Alice');
    const bob = await createUser('Bob');
    const event = await createEvent({
      endTime: '2026-03-11T15:00:00.000Z',
      inviteeIds: [alice.id, bob.id],
      startTime: '2026-03-11T14:00:00.000Z',
      status: 'TODO',
      title: 'Shared Meeting',
    });

    await deleteUser(alice.id);

    await request(app.getHttpServer()).get(`/users/${alice.id}`).expect(404);
    await expect(listUsers()).resolves.toEqual([
      expect.objectContaining({
        id: bob.id,
        name: 'Bob',
      }),
    ]);

    const remainingEvent = await getEvent(event.id);
    expect(remainingEvent.invitees).toEqual([{ id: bob.id, name: 'Bob' }]);
  });

  it('merges overlapping events for a user and updates all invitees', async () => {
    const alice = await createUser('Alice');
    const bob = await createUser('Bob');
    const carol = await createUser('Carol');

    const eventOne = await createEvent({
      description: 'Sprint planning',
      endTime: '2026-03-11T15:00:00.000Z',
      inviteeIds: [alice.id, bob.id],
      startTime: '2026-03-11T14:00:00.000Z',
      status: 'TODO',
      title: 'Planning',
    });

    const eventTwo = await createEvent({
      description: 'Retro notes',
      endTime: '2026-03-11T16:00:00.000Z',
      inviteeIds: [alice.id, carol.id],
      startTime: '2026-03-11T14:30:00.000Z',
      status: 'IN_PROGRESS',
      title: 'Retro',
    });

    await createEvent({
      description: 'Wrap up',
      endTime: '2026-03-11T19:00:00.000Z',
      inviteeIds: [alice.id],
      startTime: '2026-03-11T18:00:00.000Z',
      status: 'COMPLETED',
      title: 'Debrief',
    });

    const mergeResponse = await mergeAll(alice.id);

    expect(mergeResponse).toMatchObject({
      mergedClusters: 1,
      removedEventIds: [eventOne.id, eventTwo.id],
      userId: alice.id,
    });
    expect(mergeResponse.mergedEvents).toHaveLength(1);
    expect(mergeResponse.mergedEvents[0]).toMatchObject({
      endTime: '2026-03-11T16:00:00.000Z',
      startTime: '2026-03-11T14:00:00.000Z',
      status: 'IN_PROGRESS',
      title: 'Planning / Retro',
    });
    expect(mergeResponse.mergedEvents[0].invitees).toEqual([
      { id: alice.id, name: 'Alice' },
      { id: bob.id, name: 'Bob' },
      { id: carol.id, name: 'Carol' },
    ]);
    await expect(listEvents()).resolves.toEqual([
      expect.objectContaining({
        title: 'Debrief',
      }),
      expect.objectContaining({
        title: 'Planning / Retro',
      }),
    ]);

    const aliceAfterMerge = await getUser(alice.id);
    expect(aliceAfterMerge.events).toHaveLength(2);
    expect(aliceAfterMerge.events[0].title).toBe('Planning / Retro');
    expect(aliceAfterMerge.events[1].title).toBe('Debrief');

    const bobAfterMerge = await getUser(bob.id);
    expect(bobAfterMerge.events).toEqual([
      expect.objectContaining({
        title: 'Planning / Retro',
      }),
    ]);

    await request(app.getHttpServer())
      .get(`/events/${eventOne.id}`)
      .expect(404);
  });

  it('keeps boundary-touching events separate during merge-all', async () => {
    const user = await createUser('Dana');

    await createEvent({
      endTime: '2026-03-11T11:00:00.000Z',
      inviteeIds: [user.id],
      startTime: '2026-03-11T10:00:00.000Z',
      status: 'TODO',
      title: 'Morning Sync',
    });

    await createEvent({
      endTime: '2026-03-11T12:00:00.000Z',
      inviteeIds: [user.id],
      startTime: '2026-03-11T11:00:00.000Z',
      status: 'TODO',
      title: 'Customer Call',
    });

    await expect(mergeAll(user.id)).resolves.toEqual({
      mergedClusters: 0,
      mergedEvents: [],
      removedEventIds: [],
      userId: user.id,
    });

    const userAfterMerge = await getUser(user.id);
    expect(userAfterMerge.events).toHaveLength(2);
  });
});
