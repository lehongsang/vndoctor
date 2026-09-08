import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Examination } from '@/modules/examinations/entities/examination.entity';
import { RiskFactorAssessmentResult } from '@/modules/risk-assessments/entities/risk-factor-assessment-result.entity';
import { TreatmentTargetsService } from './treatment-targets.service';
import { TreatmentTargetsController } from './treatment-targets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientTreatmentTarget,
      HealthProfile,
      TreatmentTargetDictionary,
      StaffUser,
      Examination,
      RiskFactorAssessmentResult,
    ]),
  ],
  controllers: [TreatmentTargetsController],
  providers: [TreatmentTargetsService],
  exports: [TreatmentTargetsService],
})
export class TreatmentTargetsModule {}
