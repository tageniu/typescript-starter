import { EventEntity } from './event.entity';
import { MergeAllResult } from './events.service';

export function toEventResponse(event: EventEntity) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    status: event.status,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    invitees: [...event.invitees]
      .sort((left, right) => left.id - right.id)
      .map((invitee) => ({
        id: invitee.id,
        name: invitee.name,
      })),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function toMergeAllResponse(result: MergeAllResult) {
  return {
    userId: result.userId,
    mergedClusters: result.mergedClusters,
    removedEventIds: result.removedEventIds,
    mergedEvents: result.mergedEvents.map(toEventResponse),
  };
}
