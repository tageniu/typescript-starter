import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = this.usersRepository.create({
      name: createUserDto.name.trim(),
    });
    const savedUser = await this.usersRepository.save(user);

    return this.findById(savedUser.id);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.usersRepository.find({
      relations: {
        events: true,
      },
    });

    return users.sort((left, right) => left.id - right.id);
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      relations: {
        events: true,
      },
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);

    await this.usersRepository.remove(user);
  }
}
