import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

/**
 * @controller AuthController
 * @description Handles authentication endpoints.
 *
 * Endpoints:
 *   POST /auth/login  → Validate credentials, return JWT token
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @route POST /auth/login
   * @description Login with shopId + username + password.
   * Returns a JWT token the frontend must store and send in future requests.
   *
   * @body {LoginDto} - { shopId: 1, username: "ali", password: "123456" }
   *
   * Success response:
   * {
   *   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   *   "user": {
   *     "id": 1,
   *     "shopId": 1,
   *     "username": "ali",
   *     "role": "OWNER",
   *     "permission": null
   *   }
   * }
   */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
