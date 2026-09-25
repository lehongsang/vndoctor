import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncCurrentSchema1790301910961 implements MigrationInterface {
    name = 'SyncCurrentSchema1790301910961';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN IF EXISTS "treatmentPlan"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "examination_id" uuid`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD COLUMN IF NOT EXISTS "treatmentTargetId" uuid`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD COLUMN IF NOT EXISTS "treatmentPlanId" uuid`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "height" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "weight" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasStroke" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasMyocardialInfarction" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasAcuteCoronarySyndrome" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasCoronaryArteryDisease" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasTia" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasAorticAneurysm" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasPeripheralArteryDisease" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasAtherosclerosis" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD COLUMN IF NOT EXISTS "hasFamilialHypercholesterolemia" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patient_treatment_targets" ADD COLUMN IF NOT EXISTS "custom_targets" jsonb`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN IF EXISTS "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD COLUMN IF NOT EXISTS "icd10Code" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" DROP COLUMN IF EXISTS "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" ADD COLUMN IF NOT EXISTS "icd10Code" character varying(200)`);
        await queryRunner.query(`DROP TABLE IF EXISTS "facility_patient_links" CASCADE`);
        
        await queryRunner.query(`ALTER TABLE "treatment_plans" DROP CONSTRAINT IF EXISTS "FK_1571284cc09b4db962fe6723f35"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" ADD CONSTRAINT "FK_1571284cc09b4db962fe6723f35" FOREIGN KEY ("examination_id") REFERENCES "examinations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT IF EXISTS "FK_5e4e8e5fe9d4026031ea2bc410a"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD CONSTRAINT "FK_5e4e8e5fe9d4026031ea2bc410a" FOREIGN KEY ("treatmentTargetId") REFERENCES "patient_treatment_targets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT IF EXISTS "FK_d98087c89ad604bea47f3d166dd"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD CONSTRAINT "FK_d98087c89ad604bea47f3d166dd" FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT IF EXISTS "FK_d98087c89ad604bea47f3d166dd"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT IF EXISTS "FK_5e4e8e5fe9d4026031ea2bc410a"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" DROP CONSTRAINT IF EXISTS "FK_1571284cc09b4db962fe6723f35"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" DROP COLUMN IF EXISTS "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" ADD COLUMN IF NOT EXISTS "icd10Code" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN IF EXISTS "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD COLUMN IF NOT EXISTS "icd10Code" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "patient_treatment_targets" DROP COLUMN IF EXISTS "custom_targets"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasFamilialHypercholesterolemia"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasAtherosclerosis"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasPeripheralArteryDisease"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasAorticAneurysm"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasTia"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasCoronaryArteryDisease"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasAcuteCoronarySyndrome"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasMyocardialInfarction"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "hasStroke"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "weight"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN IF EXISTS "height"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN IF EXISTS "treatmentPlanId"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN IF EXISTS "treatmentTargetId"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" DROP COLUMN IF EXISTS "examination_id"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD COLUMN IF NOT EXISTS "treatmentPlan" text`);
    }

}
