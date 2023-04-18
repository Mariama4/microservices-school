import { Body, Controller, Get } from '@nestjs/common';
import { RMQRoute, RMQService, RMQValidate } from 'nestjs-rmq';
import { AccountUserCourses, AccountUserInfo } from '@school/contracts';
import { UserRepository } from './repositories/user.repository';
import { UserEntity } from './entities/user.entity';

@Controller('')
export class UserQueries {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly rmqService: RMQService,
	) {}
	@RMQValidate()
	@RMQRoute(AccountUserInfo.topic)
	async userInfo(@Body() { id }: AccountUserInfo.Request): Promise<AccountUserInfo.Response> {
		const user = await this.userRepository.findUserById(id);
		const profile = new UserEntity(user).getPublicProfile();
		return { profile };
	}

	@RMQValidate()
	@RMQRoute(AccountUserCourses.topic)
	async userCourses(
		@Body() { id }: AccountUserCourses.Request,
	): Promise<AccountUserCourses.Response> {
		const user = await this.userRepository.findUserById(id);
		return { courses: user.courses };
	}

	@Get('healthcheck')
	async healthCheck() {
		const isRMQ = await this.rmqService.healthCheck();
		const user = await this.userRepository.healthCheck();
		if (!isRMQ) {
			//   do smth...
		}

		if (!user) {
			//   do smth...
		}
		// continue...
	}
}
