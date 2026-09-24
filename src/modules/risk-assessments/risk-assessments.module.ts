import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskFactorAssessmentInput } from './entities/risk-factor-assessment-input.entity';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { TreatmentTargetsModule } from '@/modules/treatment-targets/treatment-targets.module';
import { RiskAssessmentsService } from './risk-assessments.service';
import { RiskAssessmentsController } from './risk-assessments.controller';
import { RiskDictionaryService } from './services/risk-dictionary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiskFactorAssessmentInput,
      RiskFactorAssessmentResult,
      HealthProfile,
      Facility,
    ]),
    TreatmentTargetsModule,
  ],
  controllers: [RiskAssessmentsController],
  providers: [RiskAssessmentsService, RiskDictionaryService],
  exports: [RiskAssessmentsService, RiskDictionaryService],
})
export class RiskAssessmentsModule {}
