import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationFields1757502018000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_verification_token column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'email_verification_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Add email_verification_expires_at column
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'email_verification_expires_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Create index on email_verification_token for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_USER_EMAIL_VERIFICATION_TOKEN" ON "user" ("email_verification_token") 
      WHERE "email_verification_token" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query('DROP INDEX "IDX_USER_EMAIL_VERIFICATION_TOKEN"');

    // Drop columns
    await queryRunner.dropColumn('user', 'email_verification_expires_at');
    await queryRunner.dropColumn('user', 'email_verification_token');
  }
}
