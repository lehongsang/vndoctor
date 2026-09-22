import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examination } from './entities/examination.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { TreatmentPlan } from '@/modules/treatment-plans/entities/treatment-plan.entity';
import { ExaminationsService } from './examinations.service';
import { ExaminationsController } from './examinations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Examination,
      HealthProfile,
      Facility,
      StaffUser,
      PatientTreatmentTarget,
      TreatmentPlan,
    ]),
  ],
  controllers: [ExaminationsController],
  providers: [ExaminationsService],
  exports: [ExaminationsService],
})
export class ExaminationsModule {}
