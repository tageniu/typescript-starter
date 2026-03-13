import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { toEventResponse } from './events.presenter';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll() {
    const events = await this.eventsService.findAll();

    return events.map(toEventResponse);
  }

  @Post()
  async create(@Body() createEventDto: CreateEventDto) {
    const event = await this.eventsService.create(createEventDto);

    return toEventResponse(event);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const event = await this.eventsService.findById(id);

    return toEventResponse(event);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.eventsService.delete(id);
  }
}
