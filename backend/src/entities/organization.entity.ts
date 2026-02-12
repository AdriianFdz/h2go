import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  mspId: string;

  // must be the one defined in the network.yaml
  // e.g., peer0-ree.localho.st:443
  @Column({ nullable: true })
  peerEndpoint: string;

  @Column({
    type: 'enum',
    enum: ['trader', 'producer', 'regulator', 'consumer'],
  })
  type: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Many orgs authorize many orgs
  @ManyToMany(() => Organization, (org) => org.authorizedByOrgs)
  @JoinTable({
    name: 'organization_authorizations',
    joinColumn: { name: 'authorizing_org_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'authorized_org_id',
      referencedColumnName: 'id',
    },
  })
  authorizedOrgs: Organization[];

  @ManyToMany(() => Organization, (org) => org.authorizedOrgs)
  authorizedByOrgs: Organization[];

  // 1 org has many users
  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}
