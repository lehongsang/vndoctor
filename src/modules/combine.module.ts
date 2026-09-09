import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RootModule } from './root/root.module';
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
import { CareSubscriptionsModule } from './care-subscriptions/care-subscriptions.module';
import { CareRequestsModule } from './care-requests/care-requests.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    AuthModule,
    RootModule,
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
    CareSubscriptionsModule,
    CareRequestsModule,
    ConversationsModule,
  ],
  exports: [
    AuthModule,
    RootModule,
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
    CareSubscriptionsModule,
    CareRequestsModule,
    ConversationsModule,
  ],
})
export class CombineModule {}

