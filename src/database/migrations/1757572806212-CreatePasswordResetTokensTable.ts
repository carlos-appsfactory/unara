import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokensTable1757572806212
  implements MigrationInterface
{
  name = 'CreatePasswordResetTokensTable1757572806212';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "user_id" uuid NOT NULL, 
        "token_hash" character varying(255) NOT NULL, 
        "expires_at" TIMESTAMP NOT NULL, 
        "used_at" TIMESTAMP NULL, 
        "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "UQ_password_reset_token_hash" UNIQUE ("token_hash"), 
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id")
      )`,
    );
    
    // Add index on user_id for efficient lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id")`,
    );
    
    // Add index on expires_at for efficient cleanup queries
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_expires_at" ON "password_reset_tokens" ("expires_at")`,
    );
    
    // Add index on used_at for tracking used tokens
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_used_at" ON "password_reset_tokens" ("used_at")`,
    );
    
    // Add foreign key constraint to users table
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_password_reset_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_password_reset_tokens_user_id"`,
    );
    
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_password_reset_tokens_used_at"`,
    );
    
    await queryRunner.query(
      `DROP INDEX "IDX_password_reset_tokens_expires_at"`,
    );
    
    await queryRunner.query(
      `DROP INDEX "IDX_password_reset_tokens_user_id"`,
    );
    
    // Drop table
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}