import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RMQModule, RMQService, RMQTestService } from 'nestjs-rmq';
import { UserModule } from './user.module';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { getMongoConfig } from '../configs/mongo.config';
import { INestApplication } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import {
	AccountBuyCourse,
	AccountCheckPayment,
	AccountLogin,
	AccountRegister,
	AccountUserInfo,
	CourseGetCourse,
	PaymentCheck,
	PaymentGenerateLink,
} from '@school/contracts';
import { verify } from 'jsonwebtoken';

const authLogin: AccountLogin.Request = {
	email: 'geo@geo.ru',
	password: '1',
};

const authRegister: AccountRegister.Request = {
	...authLogin,
	displayName: 'Georgy',
};

const courseId = 'courseId';
describe('UserController', () => {
	let app: INestApplication;
	let userRepository: UserRepository;
	let rmqService: RMQTestService;
	let configService: ConfigService;
	let token: string;
	let userId: string;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({ isGlobal: true, envFilePath: 'envs/.account.env' }),
				RMQModule.forTest({}),
				UserModule,
				AuthModule,
				MongooseModule.forRootAsync(getMongoConfig()),
			],
		}).compile();
		app = module.createNestApplication();
		userRepository = app.get<UserRepository>(UserRepository);
		rmqService = app.get(RMQService);
		configService = app.get<ConfigService>(ConfigService);
		await app.init();
		await rmqService.triggerRoute<AccountRegister.Request, AccountRegister.Response>(
			AccountRegister.topic,
			authRegister,
		);

		const { access_token } = await rmqService.triggerRoute<
			AccountLogin.Request,
			AccountLogin.Response
		>(AccountLogin.topic, authLogin);
		token = access_token;
		const data = verify(token, configService.get('JWT_SECRET'));
		userId = data['id'];
	});

	it('AccountUserInfo', async () => {
		const response = await rmqService.triggerRoute<
			AccountUserInfo.Request,
			AccountUserInfo.Response
		>(AccountUserInfo.topic, {
			id: userId,
		});
		expect(response.profile.displayName).toEqual(authRegister.displayName);
	});

	it('BuyCourse', async () => {
		const paymentLink = 'paymentLink';
		rmqService.mockReply<CourseGetCourse.Response>(CourseGetCourse.topic, {
			course: {
				_id: courseId,
				price: 1000,
			},
		});

		rmqService.mockReply<PaymentGenerateLink.Response>(PaymentGenerateLink.topic, {
			paymentLink,
		});
		const response = await rmqService.triggerRoute<
			AccountBuyCourse.Request,
			AccountBuyCourse.Response
		>(AccountBuyCourse.topic, {
			userId,
			courseId,
		});
		expect(response.paymentLink).toEqual(paymentLink);

		await expect(
			rmqService.triggerRoute<AccountBuyCourse.Request, AccountBuyCourse.Response>(
				AccountBuyCourse.topic,
				{
					userId,
					courseId,
				},
			),
		).rejects.toThrowError();
	});

	it('BuyCourse', async () => {
		rmqService.mockReply<PaymentCheck.Response>(PaymentCheck.topic, {
			status: 'success',
		});

		const response = await rmqService.triggerRoute<
			AccountCheckPayment.Request,
			AccountCheckPayment.Response
		>(AccountCheckPayment.topic, {
			userId,
			courseId,
		});
		expect(response.status).toEqual('success');
	});

	afterAll(async () => {
		await userRepository.deleteUser(authRegister.email);
		await app.close();
	});
});
