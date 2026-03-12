import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { toMergeAllResponse } from './events.presenter';
import { EventsService } from './events.service';

@Controller('users/:userId')
export class UserEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('merge-all')
  async mergeAll(@Param('userId', ParseIntPipe) userId: number) {
    const result = await this.eventsService.mergeAllForUser(userId);

    return toMergeAllResponse(result);
  }
}
