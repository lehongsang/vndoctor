import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncCurrentSchema1790301910961 implements MigrationInterface {
    name = 'SyncCurrentSchema1790301910961';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN "treatmentPlan"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" ADD "examination_id" uuid`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD "treatmentTargetId" uuid`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD "treatmentPlanId" uuid`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "height" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "weight" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasStroke" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasMyocardialInfarction" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasAcuteCoronarySyndrome" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasCoronaryArteryDisease" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasTia" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasAorticAneurysm" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasPeripheralArteryDisease" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasAtherosclerosis" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "health_profiles" ADD "hasFamilialHypercholesterolemia" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patient_treatment_targets" ADD "custom_targets" jsonb`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD "icd10Code" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" DROP COLUMN "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" ADD "icd10Code" character varying(200)`);
        await queryRunner.query(`DROP TABLE IF EXISTS "facility_patient_links" CASCADE`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" ADD CONSTRAINT "FK_1571284cc09b4db962fe6723f35" FOREIGN KEY ("examination_id") REFERENCES "examinations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD CONSTRAINT "FK_5e4e8e5fe9d4026031ea2bc410a" FOREIGN KEY ("treatmentTargetId") REFERENCES "patient_treatment_targets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD CONSTRAINT "FK_d98087c89ad604bea47f3d166dd" FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT "FK_d98087c89ad604bea47f3d166dd"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP CONSTRAINT "FK_5e4e8e5fe9d4026031ea2bc410a"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" DROP CONSTRAINT "FK_1571284cc09b4db962fe6723f35"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" DROP COLUMN "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "chronic_diseases" ADD "icd10Code" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN "icd10Code"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD "icd10Code" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "patient_treatment_targets" DROP COLUMN "custom_targets"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasFamilialHypercholesterolemia"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasAtherosclerosis"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasPeripheralArteryDisease"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasAorticAneurysm"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasTia"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasCoronaryArteryDisease"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasAcuteCoronarySyndrome"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasMyocardialInfarction"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "hasStroke"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "weight"`);
        await queryRunner.query(`ALTER TABLE "health_profiles" DROP COLUMN "height"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN "treatmentPlanId"`);
        await queryRunner.query(`ALTER TABLE "examinations" DROP COLUMN "treatmentTargetId"`);
        await queryRunner.query(`ALTER TABLE "treatment_plans" DROP COLUMN "examination_id"`);
        await queryRunner.query(`ALTER TABLE "examinations" ADD "treatmentPlan" text`);
    }

}
