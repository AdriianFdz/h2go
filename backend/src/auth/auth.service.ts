import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { IAuthenticatedUser } from './interfaces/authenticatedUser';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
    if (user && (await bcrypt.compare(password, user.password))) {
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
      avatar: user.avatar || null,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            mspId: user.organization.mspId,
            peerEndpoint: user.organization.peerEndpoint,
            type: user.organization.type,
          }
        : null,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto, requester: IAuthenticatedUser) {
    if (!requester.organization) {
      throw new ConflictException(
        'El usuario debe pertenecer a una organización',
      );
    }

    if (requester.role !== Role.ADMIN) {
      throw new ConflictException(
        'Solo un administrador puede registrar nuevos usuarios',
      );
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
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
      organization: { id: requester.organization.id } as Organization,
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
      },
    };
  }

  logout(res: any) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  async getAuthorizedByOrgs(user: IAuthenticatedUser): Promise<string[]> {
    if (!user.organization?.id) {
      return [];
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: user.organization.id },
      relations: ['authorizedByOrgs'],
    });

    if (!organization || !organization.authorizedByOrgs) {
      return [];
    }

    return organization.authorizedByOrgs.map((org) => org.id);
  }
}
