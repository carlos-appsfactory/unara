import { DataSource } from 'typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { CreateUsersTable1703000001000 } from './1703000001000-CreateUsersTable';

describe('Migration Rollback Tests', () => {
  let dataSource: DataSource;
  let migration: CreateUsersTable1703000001000;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // Start PostgreSQL container for migration testing
    postgresContainer = await new PostgreSqlContainer('postgres:17.6')
      .withDatabase('migration_test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: postgresContainer.getHost(),
      port: postgresContainer.getMappedPort(5432),
      username: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
      database: postgresContainer.getDatabase(),
      logging: false,
      synchronize: false,
    });

    await dataSource.initialize();
    migration = new CreateUsersTable1703000001000();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await postgresContainer.stop();
  });

  describe('Migration Up/Down Functionality', () => {
    beforeEach(async () => {
      // Ensure clean state before each test
      const queryRunner = dataSource.createQueryRunner();
      try {
        await queryRunner.query('DROP TABLE IF EXISTS "user" CASCADE');
      } catch (error) {
        // Table might not exist, which is fine
      } finally {
        await queryRunner.release();
      }
    });

    it('should successfully run migration up', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        await migration.up(queryRunner);

        // Verify table was created
        const tableExists = await queryRunner.hasTable('user');
        expect(tableExists).toBe(true);

        // Verify table structure
        const table = await queryRunner.getTable('user');
        expect(table).toBeDefined();

        const columnNames = table!.columns.map((col) => col.name);
        expect(columnNames).toContain('id');
        expect(columnNames).toContain('email');
        expect(columnNames).toContain('username');
        expect(columnNames).toContain('password_hash');
        expect(columnNames).toContain('fullname');
        expect(columnNames).toContain('profile_picture');
        expect(columnNames).toContain('email_verified');
        expect(columnNames).toContain('last_login');
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      } finally {
        await queryRunner.release();
      }
    });

    it('should successfully run migration down', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // First run up migration
        await migration.up(queryRunner);

        // Verify table exists
        let tableExists = await queryRunner.hasTable('user');
        expect(tableExists).toBe(true);

        // Run down migration
        await migration.down(queryRunner);

        // Verify table was dropped
        tableExists = await queryRunner.hasTable('user');
        expect(tableExists).toBe(false);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('PostgreSQL-specific Column Specifications', () => {
    beforeEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    afterEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.down(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    it('should create columns with correct PostgreSQL types and constraints', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const table = await queryRunner.getTable('user');
        const columns = table!.columns;

        // Check ID column (UUID with PostgreSQL-specific generation)
        const idColumn = columns.find((col) => col.name === 'id');
        expect(idColumn).toBeDefined();
        expect(idColumn!.isPrimary).toBe(true);
        expect(idColumn!.type).toBe('uuid');
        expect(idColumn!.default).toBe('gen_random_uuid()');

        // Check email column with unique constraint
        const emailColumn = columns.find((col) => col.name === 'email');
        expect(emailColumn).toBeDefined();
        expect(emailColumn!.isUnique).toBe(true);
        expect(emailColumn!.isNullable).toBe(false);
        expect(emailColumn!.length).toBe('255');
        expect(emailColumn!.type).toBe('varchar');

        // Check username column with unique constraint
        const usernameColumn = columns.find((col) => col.name === 'username');
        expect(usernameColumn).toBeDefined();
        expect(usernameColumn!.isUnique).toBe(true);
        expect(usernameColumn!.isNullable).toBe(false);
        expect(usernameColumn!.length).toBe('255');

        // Check password_hash column
        const passwordColumn = columns.find(
          (col) => col.name === 'password_hash',
        );
        expect(passwordColumn).toBeDefined();
        expect(passwordColumn!.isNullable).toBe(false);
        expect(passwordColumn!.type).toBe('text');

        // Check email_verified column with default
        const emailVerifiedColumn = columns.find(
          (col) => col.name === 'email_verified',
        );
        expect(emailVerifiedColumn).toBeDefined();
        expect(emailVerifiedColumn!.type).toBe('boolean');
        expect(emailVerifiedColumn!.default).toBe(false);
        expect(emailVerifiedColumn!.isNullable).toBe(false);

        // Check last_login column (nullable timestamp)
        const lastLoginColumn = columns.find(
          (col) => col.name === 'last_login',
        );
        expect(lastLoginColumn).toBeDefined();
        expect(lastLoginColumn!.type).toBe('timestamp');
        expect(lastLoginColumn!.isNullable).toBe(true);

        // Check timestamp columns with defaults
        const createdAtColumn = columns.find(
          (col) => col.name === 'created_at',
        );
        expect(createdAtColumn).toBeDefined();
        expect(createdAtColumn!.type).toBe('timestamp');
        expect(createdAtColumn!.default).toBe('CURRENT_TIMESTAMP');
        expect(createdAtColumn!.isNullable).toBe(false);

        const updatedAtColumn = columns.find(
          (col) => col.name === 'updated_at',
        );
        expect(updatedAtColumn).toBeDefined();
        expect(updatedAtColumn!.type).toBe('timestamp');
        expect(updatedAtColumn!.default).toBe('CURRENT_TIMESTAMP');
        expect(updatedAtColumn!.isNullable).toBe(false);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Index Creation and Management', () => {
    beforeEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    afterEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.down(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    it('should create PostgreSQL indexes for email and username', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const table = await queryRunner.getTable('user');
        const indices = table!.indices;

        // Check email index
        const emailIndex = indices.find((idx) => idx.name === 'IDX_USER_EMAIL');
        expect(emailIndex).toBeDefined();
        expect(emailIndex!.columnNames).toContain('email');

        // Check username index
        const usernameIndex = indices.find(
          (idx) => idx.name === 'IDX_USER_USERNAME',
        );
        expect(usernameIndex).toBeDefined();
        expect(usernameIndex!.columnNames).toContain('username');

        // Verify unique constraints (which create implicit indexes)
        const constraints = table!.uniques;
        const emailConstraint = constraints.find((c) =>
          c.columnNames.includes('email'),
        );
        const usernameConstraint = constraints.find((c) =>
          c.columnNames.includes('username'),
        );

        expect(emailConstraint).toBeDefined();
        expect(usernameConstraint).toBeDefined();
      } finally {
        await queryRunner.release();
      }
    });

    it('should drop all indexes when rolling back migration', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Verify indexes exist after up migration
        const table = await queryRunner.getTable('user');
        expect(table!.indices.length).toBeGreaterThan(0);

        // Run down migration
        await migration.down(queryRunner);

        // Verify table doesn't exist (so indexes are also gone)
        const tableExists = await queryRunner.hasTable('user');
        expect(tableExists).toBe(false);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Data Integrity During Rollback', () => {
    it('should handle rollback with existing data safely', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Run migration up
        await migration.up(queryRunner);

        // Insert test data using PostgreSQL-specific UUID generation
        await queryRunner.query(`
          INSERT INTO "user" (email, username, password_hash, fullname, email_verified, created_at, updated_at)
          VALUES 
            ('test1@example.com', 'testuser1', 'hashedpassword1', 'Test User 1', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('test2@example.com', 'testuser2', 'hashedpassword2', 'Test User 2', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        // Verify data exists
        const result = await queryRunner.query(
          'SELECT COUNT(*) as count FROM "user"',
        );
        expect(parseInt(result[0].count)).toBe(2);

        // Verify UUID generation worked
        const users = await queryRunner.query('SELECT id FROM "user"');
        users.forEach((user: any) => {
          expect(user.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
        });

        // Run migration down (should drop table and all data)
        await migration.down(queryRunner);

        // Verify table doesn't exist
        const tableExists = await queryRunner.hasTable('user');
        expect(tableExists).toBe(false);

        // Run migration up again
        await migration.up(queryRunner);

        // Verify table is clean
        const newResult = await queryRunner.query(
          'SELECT COUNT(*) as count FROM "user"',
        );
        expect(parseInt(newResult[0].count)).toBe(0);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Migration Idempotency and Safety', () => {
    it('should handle multiple up migrations gracefully', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // First migration up
        await migration.up(queryRunner);
        const firstTable = await queryRunner.getTable('user');
        expect(firstTable).toBeDefined();

        // Second migration up should throw error (table already exists)
        await expect(migration.up(queryRunner)).rejects.toThrow(
          /already exists/,
        );

        // Table should still exist and be accessible
        const tableAfterSecond = await queryRunner.getTable('user');
        expect(tableAfterSecond).toBeDefined();
      } finally {
        await queryRunner.release();
      }
    });

    it('should handle down migration on non-existent table gracefully', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Ensure table doesn't exist
        const initialTableExists = await queryRunner.hasTable('user');
        expect(initialTableExists).toBe(false);

        // Try to run down migration on non-existent table
        // This should succeed (DROP TABLE IF EXISTS should handle it)
        await expect(migration.down(queryRunner)).resolves.not.toThrow();
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('PostgreSQL-specific Features Validation', () => {
    beforeEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    afterEach(async () => {
      const queryRunner = dataSource.createQueryRunner();
      try {
        await migration.down(queryRunner);
      } finally {
        await queryRunner.release();
      }
    });

    it('should support PostgreSQL UUID extension and generation', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Check if uuid-ossp extension is available (should be enabled by migration)
        const extensionResult = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
          ) as extension_exists
        `);

        expect(extensionResult[0].extension_exists).toBe(true);

        // Test UUID generation by inserting a record
        await queryRunner.query(`
          INSERT INTO "user" (email, username, password_hash, fullname)
          VALUES ('uuid@test.com', 'uuidtest', 'hash123', 'UUID Test')
        `);

        const users = await queryRunner.query('SELECT id FROM "user"');
        expect(users).toHaveLength(1);
        expect(users[0].id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce PostgreSQL constraints correctly', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Insert first user
        await queryRunner.query(`
          INSERT INTO "user" (email, username, password_hash, fullname)
          VALUES ('constraint@test.com', 'constraintuser', 'hash123', 'Constraint Test')
        `);

        // Try to insert user with duplicate email (should fail)
        await expect(
          queryRunner.query(`
          INSERT INTO "user" (email, username, password_hash, fullname)
          VALUES ('constraint@test.com', 'anotheruser', 'hash456', 'Another User')
        `),
        ).rejects.toThrow(/duplicate key value violates unique constraint/);

        // Try to insert user with duplicate username (should fail)
        await expect(
          queryRunner.query(`
          INSERT INTO "user" (email, username, password_hash, fullname)
          VALUES ('another@test.com', 'constraintuser', 'hash456', 'Another User')
        `),
        ).rejects.toThrow(/duplicate key value violates unique constraint/);
      } finally {
        await queryRunner.release();
      }
    });
  });
});
