import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity } from './user.entity';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<UserEntity>;

  beforeEach(async () => {
    usersRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('creates a user and returns the persisted record', async () => {
    usersRepository.create?.mockReturnValue({ name: 'Alice' });
    usersRepository.save?.mockResolvedValue({ id: 1, name: 'Alice' });
    usersRepository.findOne?.mockResolvedValue({
      events: [],
      id: 1,
      name: 'Alice',
    });

    await expect(service.create({ name: ' Alice ' })).resolves.toEqual({
      events: [],
      id: 1,
      name: 'Alice',
    });
    expect(usersRepository.create).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('lists users ordered by id', async () => {
    usersRepository.find?.mockResolvedValue([
      { events: [], id: 2, name: 'Bob' },
      { events: [], id: 1, name: 'Alice' },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      { events: [], id: 1, name: 'Alice' },
      { events: [], id: 2, name: 'Bob' },
    ]);
  });

  it('throws when a user does not exist', async () => {
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an existing user', async () => {
    const user = {
      events: [],
      id: 1,
      name: 'Alice',
    };

    usersRepository.findOne?.mockResolvedValue(user);
    usersRepository.remove?.mockResolvedValue(user);

    await expect(service.delete(1)).resolves.toBeUndefined();
    expect(usersRepository.remove).toHaveBeenCalledWith(user);
  });
});
