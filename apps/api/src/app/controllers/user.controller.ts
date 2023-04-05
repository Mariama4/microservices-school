import { Controller, Post, UseGuards } from '@nestjs/common';
import { JWTAuthGuard } from '../guards/jwt.guard';
import { UserId } from '../guards/user.decorator';

@Controller('user')
export class UserController {
	constructor() {
		return;
	}

	@UseGuards(JWTAuthGuard)
	@Post('info')
	async register(@UserId() userId: string) {
		return { id: userId };
	}
}
