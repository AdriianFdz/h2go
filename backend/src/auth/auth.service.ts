import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role, User } from "../entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (user && await bcrypt.compare(password, user.password)) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...result } = user;
            return result;
        }
        return null;
    }

    login(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            organizationId: user.organization?.id || null,
            avatar: user.avatar || null
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async register(registerDto: RegisterDto, requester: User) {
        if (!requester.organization) {
            throw new ConflictException('El usuario debe pertenecer a una organización');
        }

        if (requester.role !== Role.ADMIN) {
            throw new ConflictException('Solo un administrador puede registrar nuevos usuarios');
        }

        const existingUser = await this.usersRepository.findOne({
            where: { email: registerDto.email }
        });

        if (existingUser) {
            throw new ConflictException('El email ya está registrado');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const newUser = this.usersRepository.create({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            role: Role.USER,
            organization: requester.organization,
        });

        const savedUser = await this.usersRepository.save(newUser);

        return {
            user: {
                id: savedUser.id,
                name: savedUser.name,
                email: savedUser.email,
                createdAt: savedUser.createdAt,
                role: savedUser.role,
                organization: savedUser.organization,
            }
        };
    }

    logout(res: any) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
    }
}