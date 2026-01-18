import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

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

    @Column({ type: 'enum', enum: ['Dev', 'Admin', 'User'], default: 'User' })
    role: 'Dev' | 'Admin' | 'User';

    @ManyToOne(() => Organization, organization => organization.users)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;
}