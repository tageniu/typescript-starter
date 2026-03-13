import { UserEntity } from './user.entity';

export function toUserResponse(user: UserEntity) {
  const events = [...(user.events ?? [])].sort(
    (left, right) => left.startTime.getTime() - right.startTime.getTime(),
  );

  return {
    id: user.id,
    name: user.name,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    })),
  };
}
