import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

/** Build TypeORM options from env. Used by AppModule and CLI datasource. */
export const buildTypeOrmOptions = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USERNAME', 'postgres'),
  password: config.get<string>('DB_PASSWORD', 'postgres'),
  database: config.get<string>('DB_NAME', 'tripmate'),
  synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
  logging: config.get<string>('DB_LOGGING') === 'true',
  entities: [join(__dirname, '/**/*.entity.{js,ts}')],
  migrations: [join(__dirname, '/migrations/*.{js,ts}')],
  autoLoadEntities: true,
});
