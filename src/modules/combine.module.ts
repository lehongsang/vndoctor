import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RootModule } from './root/root.module';
import { UsersModule } from './users/users.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { StaffModule } from './staff/staff.module';
import { AccountsModule } from './accounts/accounts.module';
import { ChronicDiseasesModule } from './chronic-diseases/chronic-diseases.module';
import { HealthProfilesModule } from './health-profiles/health-profiles.module';
import { PatientLinksModule } from './patient-links/patient-links.module';
import { HealthRecordsModule } from './health-records/health-records.module';
import { RiskAssessmentsModule } from './risk-assessments/risk-assessments.module';
import { ExaminationsModule } from './examinations/examinations.module';
import { TreatmentDictionariesModule } from './treatment-dictionaries/treatment-dictionaries.module';
import { TreatmentTargetsModule } from './treatment-targets/treatment-targets.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';
import { CarePackagesModule } from './care-packages/care-packages.module';

@Module({
  imports: [
    AuthModule,
    RootModule,
    UsersModule,
    FacilitiesModule,
    StaffModule,
    AccountsModule,
    ChronicDiseasesModule,
    HealthProfilesModule,
    PatientLinksModule,
    HealthRecordsModule,
    RiskAssessmentsModule,
    ExaminationsModule,
    TreatmentDictionariesModule,
    TreatmentTargetsModule,
    TreatmentPlansModule,
    CarePackagesModule,
  ],
  exports: [
    AuthModule,
    RootModule,
    UsersModule,
    FacilitiesModule,
    StaffModule,
    AccountsModule,
    ChronicDiseasesModule,
    HealthProfilesModule,
    PatientLinksModule,
    HealthRecordsModule,
    RiskAssessmentsModule,
    ExaminationsModule,
    TreatmentDictionariesModule,
    TreatmentTargetsModule,
    TreatmentPlansModule,
    CarePackagesModule,
  ],
})
export class CombineModule {}

