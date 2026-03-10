import { Controller, Post, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { IAuthenticatedUser } from './interfaces/authenticatedUser';
import type { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  login(@Req() req, @Res({ passthrough: true }) res: Response) {
    const { access_token } = this.authService.login(req.user);

    // HttpOnly cookie
    res.cookie('token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(process.env.JWT_EXPIRATION ?? '86400000'), // Default 1 day
    });

    return { message: 'Logged in successfully' };
  }

  @Get('verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Verify authentication' })
  @ApiResponse({ status: 200, description: 'User authenticated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async verify(@Req() req: { user: IAuthenticatedUser }) {
    const authorizedByOrgs = await this.authService.getAuthorizedByOrgs(
      req.user,
    );
    return {
      authenticated: true,
      user: req.user,
      authorizedByOrgs,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
    return { message: 'Logged out successfully' };
  }
}
