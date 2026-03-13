import { UserEntity } from '../users/user.entity';
import { EventStatus } from './event-status.enum';
import {
  buildOverlappingClusters,
  mergeEventCluster,
} from './event-merge.util';
import { EventEntity } from './event.entity';

describe('event merge utilities', () => {
  function createUser(id: number, name: string): UserEntity {
    return { events: [], id, name };
  }

  function createEvent(overrides: Partial<EventEntity>): EventEntity {
    return {
      createdAt: new Date('2026-03-11T12:00:00.000Z'),
      description: null,
      endTime: new Date('2026-03-11T15:00:00.000Z'),
      id: 1,
      invitees: [],
      startTime: new Date('2026-03-11T14:00:00.000Z'),
      status: EventStatus.TODO,
      title: 'Untitled',
      updatedAt: new Date('2026-03-11T12:00:00.000Z'),
      ...overrides,
    };
  }

  it('returns no clusters for an empty list', () => {
    expect(buildOverlappingClusters([])).toEqual([]);
  });

  it('keeps a single event as its own cluster', () => {
    const event = createEvent({ id: 1 });

    expect(buildOverlappingClusters([event])).toEqual([[event]]);
  });

  it('groups directly overlapping events into one cluster', () => {
    const cluster = buildOverlappingClusters([
      createEvent({
        endTime: new Date('2026-03-11T15:00:00.000Z'),
        id: 1,
        startTime: new Date('2026-03-11T14:00:00.000Z'),
      }),
      createEvent({
        endTime: new Date('2026-03-11T16:00:00.000Z'),
        id: 2,
        startTime: new Date('2026-03-11T14:30:00.000Z'),
      }),
    ]);

    expect(cluster).toHaveLength(1);
    expect(cluster[0].map((event) => event.id)).toEqual([1, 2]);
  });

  it('groups transitive overlaps into the same cluster', () => {
    const cluster = buildOverlappingClusters([
      createEvent({
        endTime: new Date('2026-03-11T11:00:00.000Z'),
        id: 1,
        startTime: new Date('2026-03-11T10:00:00.000Z'),
      }),
      createEvent({
        endTime: new Date('2026-03-11T12:00:00.000Z'),
        id: 2,
        startTime: new Date('2026-03-11T10:30:00.000Z'),
      }),
      createEvent({
        endTime: new Date('2026-03-11T13:00:00.000Z'),
        id: 3,
        startTime: new Date('2026-03-11T11:45:00.000Z'),
      }),
    ]);

    expect(cluster).toHaveLength(1);
    expect(cluster[0].map((event) => event.id)).toEqual([1, 2, 3]);
  });

  it('keeps boundary-touching events in separate clusters', () => {
    const clusters = buildOverlappingClusters([
      createEvent({
        endTime: new Date('2026-03-11T11:00:00.000Z'),
        id: 1,
        startTime: new Date('2026-03-11T10:00:00.000Z'),
      }),
      createEvent({
        endTime: new Date('2026-03-11T12:00:00.000Z'),
        id: 2,
        startTime: new Date('2026-03-11T11:00:00.000Z'),
      }),
    ]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].map((event) => event.id)).toEqual([1]);
    expect(clusters[1].map((event) => event.id)).toEqual([2]);
  });

  it('keeps separated events in separate clusters', () => {
    const clusters = buildOverlappingClusters([
      createEvent({
        endTime: new Date('2026-03-11T11:00:00.000Z'),
        id: 1,
        startTime: new Date('2026-03-11T10:00:00.000Z'),
      }),
      createEvent({
        endTime: new Date('2026-03-11T13:00:00.000Z'),
        id: 2,
        startTime: new Date('2026-03-11T12:00:00.000Z'),
      }),
    ]);

    expect(clusters).toHaveLength(2);
  });

  it('merges invitees, titles, descriptions, and highest status', () => {
    const alice = createUser(1, 'Alice');
    const bob = createUser(2, 'Bob');
    const carol = createUser(3, 'Carol');

    const mergedEvent = mergeEventCluster([
      createEvent({
        description: 'Sprint planning',
        endTime: new Date('2026-03-11T15:00:00.000Z'),
        id: 1,
        invitees: [alice, bob],
        startTime: new Date('2026-03-11T14:00:00.000Z'),
        status: EventStatus.TODO,
        title: 'Planning',
      }),
      createEvent({
        description: 'Retro notes',
        endTime: new Date('2026-03-11T16:00:00.000Z'),
        id: 2,
        invitees: [alice, carol],
        startTime: new Date('2026-03-11T14:30:00.000Z'),
        status: EventStatus.COMPLETED,
        title: 'Retro',
      }),
    ]);

    expect(mergedEvent).toMatchObject({
      description: 'Sprint planning\n\nRetro notes',
      endTime: new Date('2026-03-11T16:00:00.000Z'),
      startTime: new Date('2026-03-11T14:00:00.000Z'),
      status: EventStatus.COMPLETED,
      title: 'Planning / Retro',
    });
    expect(mergedEvent.invitees).toEqual([alice, bob, carol]);
  });
});
