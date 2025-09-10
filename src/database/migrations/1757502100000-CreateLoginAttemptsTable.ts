import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateLoginAttemptsTable1757502100000
  implements MigrationInterface
{
  name = 'CreateLoginAttemptsTable1757502100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'login_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'identifier',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'attempt_count',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'blocked_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_attempt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'login_attempts',
      new Index('IDX_login_attempts_identifier', ['identifier']),
    );

    await queryRunner.createIndex(
      'login_attempts',
      new Index('IDX_login_attempts_ip_address', ['ip_address']),
    );

    await queryRunner.createIndex(
      'login_attempts',
      new Index('IDX_login_attempts_blocked_until', ['blocked_until']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('login_attempts');
  }
}
