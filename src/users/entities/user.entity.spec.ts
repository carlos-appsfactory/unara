import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { User } from './user.entity';

describe('User Entity', () => {
  let dataSource: DataSource;
  let postgresContainer: StartedPostgreSqlContainer;
  let app: TestingModule;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:17.6')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Create test module with PostgreSQL container
    app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getMappedPort(5432),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          entities: [User],
          synchronize: true, // Use synchronize for testing
          logging: false,
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

  describe('Entity Creation and Validation', () => {
    let repository: any;

    beforeEach(async () => {
      repository = dataSource.getRepository(User);
      await repository.clear();
    });

    it('should create a User instance with required fields', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword123',
        fullname: 'Test User',
      };

      const user = repository.create(userData);
      const savedUser = await repository.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID format
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.password_hash).toBe(userData.password_hash);
      expect(savedUser.fullname).toBe(userData.fullname);
    });

    it('should have default values for authentication fields', async () => {
      const userData = {
        email: 'default@example.com',
        username: 'defaultuser',
        password_hash: 'hashedpassword123',
        fullname: 'Default User',
      };

      const user = repository.create(userData);
      const savedUser = await repository.save(user);

      expect(savedUser.email_verified).toBe(false); // Default value
      expect(savedUser.last_login).toBeNull();
      expect(savedUser.profile_picture).toBeNull();
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });
  });

  describe('Database Constraints', () => {
    let repository: any;

    beforeEach(async () => {
      repository = dataSource.getRepository(User);
      await repository.clear();
    });

    it('should enforce email uniqueness constraint', async () => {
      const user1 = repository.create({
        email: 'unique@example.com',
        username: 'user1',
        password_hash: 'hash1',
        fullname: 'User One',
      });
      await repository.save(user1);

      const user2 = repository.create({
        email: 'unique@example.com', // Same email
        username: 'user2',
        password_hash: 'hash2',
        fullname: 'User Two',
      });

      await expect(repository.save(user2)).rejects.toThrow();
    });

    it('should enforce username uniqueness constraint', async () => {
      const user1 = repository.create({
        email: 'user1@example.com',
        username: 'uniqueuser',
        password_hash: 'hash1',
        fullname: 'User One',
      });
      await repository.save(user1);

      const user2 = repository.create({
        email: 'user2@example.com',
        username: 'uniqueuser', // Same username
        password_hash: 'hash2',
        fullname: 'User Two',
      });

      await expect(repository.save(user2)).rejects.toThrow();
    });

    it('should save user with all authentication fields', async () => {
      const now = new Date();
      const userData = {
        email: 'fulluser@example.com',
        username: 'fulluser',
        password_hash: 'hashedpassword123',
        fullname: 'Full User',
        profile_picture: 'https://example.com/avatar.jpg',
        email_verified: true,
        last_login: now,
      };

      const user = repository.create(userData);
      const savedUser = await repository.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.password_hash).toBe(userData.password_hash);
      expect(savedUser.fullname).toBe(userData.fullname);
      expect(savedUser.profile_picture).toBe(userData.profile_picture);
      expect(savedUser.email_verified).toBe(userData.email_verified);
      expect(savedUser.last_login).toEqual(userData.last_login);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });
  });

  describe('PostgreSQL-specific Features', () => {
    let repository: any;

    beforeEach(async () => {
      repository = dataSource.getRepository(User);
      await repository.clear();
    });

    it('should generate UUID automatically', async () => {
      const user1 = repository.create({
        email: 'uuid1@example.com',
        username: 'uuiduser1',
        password_hash: 'hash1',
        fullname: 'UUID User 1',
      });

      const user2 = repository.create({
        email: 'uuid2@example.com',
        username: 'uuiduser2',
        password_hash: 'hash2',
        fullname: 'UUID User 2',
      });

      const [savedUser1, savedUser2] = await repository.save([user1, user2]);

      expect(savedUser1.id).toBeDefined();
      expect(savedUser2.id).toBeDefined();
      expect(savedUser1.id).not.toBe(savedUser2.id); // Different UUIDs

      // Verify UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(savedUser1.id).toMatch(uuidRegex);
      expect(savedUser2.id).toMatch(uuidRegex);
    });

    it('should handle timestamp fields correctly', async () => {
      const user = repository.create({
        email: 'timestamp@example.com',
        username: 'timestampuser',
        password_hash: 'hash123',
        fullname: 'Timestamp User',
      });

      const savedUser = await repository.save(user);
      const beforeUpdate = savedUser.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      savedUser.fullname = 'Updated User';
      const updatedUser = await repository.save(savedUser);

      expect(updatedUser.createdAt).toBeDefined();
      expect(updatedUser.updatedAt).toBeDefined();
      expect(updatedUser.createdAt).toBeInstanceOf(Date);
      expect(updatedUser.updatedAt).toBeInstanceOf(Date);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        beforeUpdate.getTime(),
      );
    });

    it('should handle null values correctly for optional fields', async () => {
      const user = repository.create({
        email: 'nullable@example.com',
        username: 'nullableuser',
        password_hash: 'hash123',
        fullname: 'Nullable User',
        last_login: null,
        profile_picture: null,
      });

      const savedUser = await repository.save(user);

      expect(savedUser.last_login).toBeNull();
      expect(savedUser.profile_picture).toBeNull();
      expect(savedUser.email_verified).toBe(false); // Default value, not null
    });
  });

  describe('Database Indexes Performance', () => {
    let repository: any;

    beforeEach(async () => {
      repository = dataSource.getRepository(User);
      await repository.clear();

      // Create test data
      for (let i = 0; i < 10; i++) {
        const user = repository.create({
          email: `user${i}@example.com`,
          username: `user${i}`,
          password_hash: `hash${i}`,
          fullname: `User ${i}`,
        });
        await repository.save(user);
      }
    });

    it('should efficiently find user by email (indexed)', async () => {
      const start = Date.now();
      const user = await repository.findOne({
        where: { email: 'user5@example.com' },
      });
      const duration = Date.now() - start;

      expect(user).toBeDefined();
      expect(user.email).toBe('user5@example.com');
      expect(user.username).toBe('user5');
      expect(duration).toBeLessThan(100); // Should be fast due to index
    });

    it('should efficiently find user by username (indexed)', async () => {
      const start = Date.now();
      const user = await repository.findOne({ where: { username: 'user7' } });
      const duration = Date.now() - start;

      expect(user).toBeDefined();
      expect(user.username).toBe('user7');
      expect(user.email).toBe('user7@example.com');
      expect(duration).toBeLessThan(100); // Should be fast due to index
    });
  });
});
