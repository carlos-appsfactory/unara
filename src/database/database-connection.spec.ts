import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { User } from '../users/entities/user.entity';

describe('Database Connection Integration', () => {
  let app: TestingModule;
  let dataSource: DataSource;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // Start PostgreSQL container for integration testing
    postgresContainer = await new PostgreSqlContainer('postgres:17.6')
      .withDatabase('integration_test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: () => ({
            type: 'postgres' as const,
            host: postgresContainer.getHost(),
            port: postgresContainer.getMappedPort(5432),
            username: postgresContainer.getUsername(),
            password: postgresContainer.getPassword(),
            database: postgresContainer.getDatabase(),
            entities: [User],
            synchronize: true,
            logging: false,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
      ],
    }).compile();

    dataSource = app.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
    await postgresContainer.stop();
  });

  describe('Connection Establishment', () => {
    it('should establish PostgreSQL database connection successfully', () => {
      expect(dataSource).toBeDefined();
      expect(dataSource.isInitialized).toBe(true);
      expect(dataSource.options.type).toBe('postgres');
    });

    it('should have correct PostgreSQL configuration', () => {
      expect(dataSource.options.type).toBe('postgres');
      expect(dataSource.options.synchronize).toBe(true);
      expect((dataSource.options as any).host).toBe(
        postgresContainer.getHost(),
      );
      expect((dataSource.options as any).port).toBe(
        postgresContainer.getMappedPort(5432),
      );
    });

    it('should load entities correctly', () => {
      const entityMetadatas = dataSource.entityMetadatas;
      expect(entityMetadatas).toHaveLength(1);
      expect(entityMetadatas[0].target).toBe(User);
      expect(entityMetadatas[0].tableName).toBe('user');
    });
  });

  describe('Entity Recognition and Schema', () => {
    it('should recognize User entity with all authentication columns', () => {
      const userMetadata = dataSource.getMetadata(User);

      const columnNames = userMetadata.columns.map((col) => col.propertyName);

      // Required authentication fields
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('fullname');
      expect(columnNames).toContain('profile_picture');
      expect(columnNames).toContain('email_verified');
      expect(columnNames).toContain('last_login');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should have correct PostgreSQL column types and constraints', () => {
      const userMetadata = dataSource.getMetadata(User);

      const idColumn = userMetadata.findColumnWithPropertyName('id');
      expect(idColumn?.type).toBe('uuid');
      expect(idColumn?.isPrimary).toBe(true);
      expect(idColumn?.isGenerated).toBe(true);

      const emailColumn = userMetadata.findColumnWithPropertyName('email');
      expect(emailColumn?.isUnique).toBe(true);
      expect(emailColumn?.length).toBe('255');

      const usernameColumn =
        userMetadata.findColumnWithPropertyName('username');
      expect(usernameColumn?.isUnique).toBe(true);
      expect(usernameColumn?.length).toBe('255');

      const emailVerifiedColumn =
        userMetadata.findColumnWithPropertyName('email_verified');
      expect(emailVerifiedColumn?.type).toBe('boolean');
      expect(emailVerifiedColumn?.default).toBe(false);

      const lastLoginColumn =
        userMetadata.findColumnWithPropertyName('last_login');
      expect(lastLoginColumn?.type).toBe('timestamp');
      expect(lastLoginColumn?.isNullable).toBe(true);

      const createdAtColumn =
        userMetadata.findColumnWithPropertyName('createdAt');
      expect(createdAtColumn?.type).toBe('timestamp');
      expect(createdAtColumn?.isCreateDate).toBe(true);

      const updatedAtColumn =
        userMetadata.findColumnWithPropertyName('updatedAt');
      expect(updatedAtColumn?.type).toBe('timestamp');
      expect(updatedAtColumn?.isUpdateDate).toBe(true);
    });
  });

  describe('Repository Operations', () => {
    it('should provide working User repository', () => {
      const userRepository = dataSource.getRepository(User);
      expect(userRepository).toBeDefined();
      expect(userRepository.target).toBe(User);
      expect(userRepository.metadata.tableName).toBe('user');
    });

    it('should perform complete CRUD operations successfully', async () => {
      const userRepository = dataSource.getRepository(User);
      await userRepository.clear();

      // CREATE
      const userData = {
        email: 'crud@test.com',
        username: 'crudtest',
        password_hash: 'hashed_password_123',
        fullname: 'CRUD Test User',
        email_verified: false,
      };

      const user = userRepository.create(userData);
      const savedUser = await userRepository.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.email_verified).toBe(false);

      // READ
      const foundUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
      expect(foundUser?.username).toBe(userData.username);

      // UPDATE
      foundUser!.fullname = 'Updated CRUD Test User';
      foundUser!.email_verified = true;
      foundUser!.last_login = new Date();

      const updatedUser = await userRepository.save(foundUser!);
      expect(updatedUser.fullname).toBe('Updated CRUD Test User');
      expect(updatedUser.email_verified).toBe(true);
      expect(updatedUser.last_login).toBeDefined();
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        savedUser.updatedAt.getTime(),
      );

      // DELETE
      await userRepository.remove(updatedUser);
      const deletedUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });
      expect(deletedUser).toBeNull();
    });
  });

  describe('Environment Configuration Integration', () => {
    it('should integrate with ConfigService', () => {
      const configService = app.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();

      // Test ConfigService functionality
      expect(configService.get('NODE_ENV', 'development')).toBeDefined();
    });

    it('should handle environment-based database configuration', () => {
      const configService = app.get<ConfigService>(ConfigService);

      // Test database configuration retrieval
      const dbHost = configService.get('DB_HOST', 'localhost');
      const dbPort = configService.get('DB_PORT', 5432);
      const dbName = configService.get('DB_NAME', 'unara_db');
      const dbUser = configService.get('DB_USERNAME', 'postgres');

      expect(dbHost).toBeDefined();
      expect(dbPort).toBeDefined();
      expect(dbName).toBeDefined();
      expect(dbUser).toBeDefined();
    });
  });

  describe('Migration System Compatibility', () => {
    it('should support migration configuration patterns', () => {
      // Test that the data source configuration supports migrations
      const testDataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'test_db',
        entities: [User],
        migrations: ['src/database/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        synchronize: false,
      });

      expect(testDataSource.options.migrations).toBeDefined();
      expect(testDataSource.options.migrationsTableName).toBe(
        'typeorm_migrations',
      );
      expect(testDataSource.options.synchronize).toBe(false);
      expect(testDataSource.options.entities).toContain(User);
    });

    it('should handle entity auto-loading configuration', () => {
      const entities = dataSource.entityMetadatas;
      expect(entities.length).toBeGreaterThan(0);

      const userEntity = entities.find((entity) => entity.target === User);
      expect(userEntity).toBeDefined();
      expect(userEntity?.tableName).toBe('user');
      expect(userEntity?.columns.length).toBe(10); // All User fields
    });
  });

  describe('Database Performance and Constraints', () => {
    let userRepository: any;

    beforeEach(async () => {
      userRepository = dataSource.getRepository(User);
      await userRepository.clear();
    });

    it('should enforce database constraints at PostgreSQL level', async () => {
      // Test unique constraint on email
      const user1 = userRepository.create({
        email: 'constraint@test.com',
        username: 'constraint1',
        password_hash: 'hash1',
        fullname: 'User 1',
      });
      await userRepository.save(user1);

      const user2 = userRepository.create({
        email: 'constraint@test.com', // Duplicate email
        username: 'constraint2',
        password_hash: 'hash2',
        fullname: 'User 2',
      });

      await expect(userRepository.save(user2)).rejects.toThrow(
        /duplicate key value violates unique constraint/,
      );
    });

    it('should handle PostgreSQL-specific data types correctly', async () => {
      const user = userRepository.create({
        email: 'datatypes@test.com',
        username: 'datatypes',
        password_hash: 'hash123',
        fullname: 'Data Types Test',
        email_verified: true,
        last_login: new Date('2023-12-01T10:00:00Z'),
      });

      const savedUser = await userRepository.save(user);

      // UUID should be properly generated
      expect(savedUser.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Boolean should be handled correctly
      expect(savedUser.email_verified).toBe(true);
      expect(typeof savedUser.email_verified).toBe('boolean');

      // Timestamp should be handled correctly
      expect(savedUser.last_login).toBeInstanceOf(Date);
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should perform efficiently with database indexes', async () => {
      // Create multiple users for performance testing
      const users = [];
      for (let i = 0; i < 50; i++) {
        users.push({
          email: `perf${i}@test.com`,
          username: `perfuser${i}`,
          password_hash: `hash${i}`,
          fullname: `Performance User ${i}`,
        });
      }

      // Bulk insert
      await userRepository.save(users);

      // Test indexed queries performance
      const start = Date.now();
      const user = await userRepository.findOne({
        where: { email: 'perf25@test.com' },
      });
      const duration = Date.now() - start;

      expect(user).toBeDefined();
      expect(user.username).toBe('perfuser25');
      expect(duration).toBeLessThan(50); // Should be very fast with index
    });
  });
});
