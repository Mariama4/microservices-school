import { Body, Controller } from '@nestjs/common';
import { RMQRoute, RMQValidate } from 'nestjs-rmq';
import { AccountBuyCourse, AccountChangeProfile, AccountCheckPayment } from '@school/contracts';
import { UserRepository } from './repositories/user.repository';
import { UserEntity } from './entities/user.entity';

@Controller()
export class UserCommands {
	constructor(private readonly userRepository: UserRepository) {}
	@RMQValidate()
	@RMQRoute(AccountChangeProfile.topic)
	async userInfo(
		@Body() { user, id }: AccountChangeProfile.Request,
	): Promise<AccountChangeProfile.Response> {
		const existedUser = await this.userRepository.findUserById(id);
		if (!existedUser) {
			throw new Error('Такого пользователя не существует');
		}
		const userEntity = new UserEntity(existedUser).updateProfile(user.displayName);
		await this.userRepository.updateUser(userEntity);
		return {};
	}

	@RMQValidate()
	@RMQRoute(AccountBuyCourse.topic)
	async buyCourse(
		@Body() { userId, courseId }: AccountBuyCourse.Request,
	): Promise<AccountBuyCourse.Response> {
		return { paymentUrl: '' };
	}

	@RMQValidate()
	@RMQRoute(AccountCheckPayment.topic)
	async checkPayment(
		@Body() { userId, courseId }: AccountCheckPayment.Request,
	): Promise<AccountCheckPayment.Response> {
		return { status: undefined };
	}
}
