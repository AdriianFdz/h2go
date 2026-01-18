import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({
        type: 'enum',
        enum: ['trader', 'productor', 'consumer']
    })
    type: string;

    @Column()
    createdAt: Date;

    // Many orgs authorize many orgs
    @ManyToMany(() => Organization, org => org.authorizedByOrgs)
    @JoinTable({
        name: 'organization_authorizations',
        joinColumn: { name: 'authorizing_org_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'authorized_org_id', referencedColumnName: 'id' }
    })
    authorizedOrgs: Organization[];

    @ManyToMany(() => Organization, org => org.authorizedOrgs)
    authorizedByOrgs: Organization[];

    // 1 org has many users
    @OneToMany(() => User, user => user.organization)
    users: User[];
}