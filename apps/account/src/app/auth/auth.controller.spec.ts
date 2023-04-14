import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RMQModule, RMQService, RMQTestService } from 'nestjs-rmq';
import { UserModule } from '../user/user.module';
import { AuthModule } from './auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { getMongoConfig } from '../configs/mongo.config';
import { INestApplication } from '@nestjs/common';
import { UserRepository } from '../user/repositories/user.repository';
import { AccountLogin, AccountRegister } from '@school/contracts';

const authLogin: AccountLogin.Request = {
	email: 'geo0@geo0.ru',
	password: '1',
};

const authRegister: AccountRegister.Request = {
	...authLogin,
	displayName: 'Georgy',
};
describe('AuthController', () => {
	let app: INestApplication;
	let userRepository: UserRepository;
	let rmqService: RMQTestService;

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
		await app.init();
	});

	it('Register', async () => {
		const response = await rmqService.triggerRoute<
			AccountRegister.Request,
			AccountRegister.Response
		>(AccountRegister.topic, authRegister);
		expect(response.email).toEqual(authRegister.email);
	});

	it('Login', async () => {
		const response = await rmqService.triggerRoute<AccountLogin.Request, AccountLogin.Response>(
			AccountLogin.topic,
			authLogin,
		);
		expect(response.access_token).toBeDefined();
	});

	afterAll(async () => {
		await userRepository.deleteUser(authRegister.email);
		await app.close();
	});
});
