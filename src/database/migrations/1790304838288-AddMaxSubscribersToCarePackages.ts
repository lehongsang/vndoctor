import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxSubscribersToCarePackages1790304838288 implements MigrationInterface {
    name = 'AddMaxSubscribersToCarePackages1790304838288';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "care_packages" ADD COLUMN IF NOT EXISTS "max_subscribers" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "care_packages" DROP COLUMN IF EXISTS "max_subscribers"`);
    }

}
