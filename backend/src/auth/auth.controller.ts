import { Controller, Post, UseGuards, Body, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../entities/user.entity';
import type { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @UseGuards(AuthGuard('local'))
    @ApiOperation({ summary: 'Login de usuario' })
    @ApiResponse({ status: 200, description: 'Login exitoso' })
    @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
    login(@Body() loginDto: LoginDto, @Req() req, @Res({ passthrough: true }) res: Response) {
        const { access_token } = this.authService.login(req.user);
        
        // HttpOnly cookie
        res.cookie('token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });
        
        return { message: 'Login exitoso' };
    }
    @Post('register')
    @ApiOperation({ summary: 'Registro de usuario' })
    @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    register(@Body() registerDto: RegisterDto, @Req() req) {
        const user = req.user as User;
        return this.authService.register(registerDto, user);
    }
}