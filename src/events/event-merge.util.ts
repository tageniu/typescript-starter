import { UserEntity } from '../users/user.entity';
import { EventEntity } from './event.entity';
import { EventStatus } from './event-status.enum';

const STATUS_PRIORITY: Record<EventStatus, number> = {
  [EventStatus.COMPLETED]: 2,
  [EventStatus.IN_PROGRESS]: 1,
  [EventStatus.TODO]: 0,
};

export function buildOverlappingClusters(
  events: EventEntity[],
): EventEntity[][] {
  if (events.length === 0) {
    return [];
  }

  const sortedEvents = [...events].sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime(),
  );
  const clusters: EventEntity[][] = [];
  let currentCluster: EventEntity[] = [sortedEvents[0]];
  let currentEndTime = sortedEvents[0].endTime.getTime();

  for (const event of sortedEvents.slice(1)) {
    if (event.startTime.getTime() < currentEndTime) {
      currentCluster.push(event);
      currentEndTime = Math.max(currentEndTime, event.endTime.getTime());
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [event];
    currentEndTime = event.endTime.getTime();
  }

  clusters.push(currentCluster);

  return clusters;
}

export function mergeEventCluster(events: EventEntity[]) {
  if (events.length === 0) {
    throw new Error('Cannot merge an empty event cluster');
  }

  const sortedEvents = [...events].sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime(),
  );
  const titles = new Set<string>();
  const descriptions: string[] = [];
  const inviteesById = new Map<number, UserEntity>();
  let highestStatus = sortedEvents[0].status;
  let latestEndTime = sortedEvents[0].endTime.getTime();

  for (const event of sortedEvents) {
    titles.add(event.title);

    if (event.description?.trim()) {
      descriptions.push(event.description.trim());
    }

    if (STATUS_PRIORITY[event.status] > STATUS_PRIORITY[highestStatus]) {
      highestStatus = event.status;
    }

    latestEndTime = Math.max(latestEndTime, event.endTime.getTime());

    for (const invitee of event.invitees) {
      inviteesById.set(invitee.id, invitee);
    }
  }

  return {
    description: descriptions.length > 0 ? descriptions.join('\n\n') : null,
    endTime: new Date(latestEndTime),
    invitees: [...inviteesById.values()].sort(
      (left, right) => left.id - right.id,
    ),
    startTime: new Date(sortedEvents[0].startTime.getTime()),
    status: highestStatus,
    title: [...titles].join(' / '),
  };
}
