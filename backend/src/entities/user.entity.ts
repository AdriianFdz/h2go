import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

export enum Role {
    DEV = 'Dev',
    ADMIN = 'Admin',
    USER = 'User'
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    name: string;

    @Column()
    createdAt: Date;

    @Column({ type: 'enum', enum: Role, default: Role.USER })
    role: Role;

    @Column({ nullable: true })
    avatar?: string;

    @ManyToOne(() => Organization, organization => organization.users)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;
}