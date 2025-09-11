import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateOAuthProvidersTable1736543021000 implements MigrationInterface {
  name = 'CreateOAuthProvidersTable1736543021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'oauth_providers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider_name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'provider_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'picture',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_oauth_providers_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_oauth_providers_provider',
            columnNames: ['provider_name', 'provider_id'],
          },
          {
            name: 'IDX_oauth_providers_user_provider',
            columnNames: ['user_id', 'provider_name'],
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'oauth_providers',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('oauth_providers');
  }
}