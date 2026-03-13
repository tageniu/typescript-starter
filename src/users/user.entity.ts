import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EventEntity } from '../events/event.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => EventEntity, (event) => event.invitees)
  events: EventEntity[];
}
