import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { UsersService } from '@/modules/user/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Registered')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged in')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Refreshed')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out')
  async logout(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: Partial<RefreshDto>,
  ) {
    await this.auth.logout(user.sub, body.refreshToken);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ResponseMessage('Profile')
  profile(@CurrentUser() user: JwtUserPayload) {
    return this.users.findById(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  @ResponseMessage('Password changed')
  async changePassword(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(user.sub, dto);
    return null;
  }
}
