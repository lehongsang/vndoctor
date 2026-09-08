import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthProfile } from './entities/health-profile.entity';
import { HealthProfilesService } from './health-profiles.service';
import { HealthProfilesController } from './health-profiles.controller';
import { ChronicDiseasesModule } from '@/modules/chronic-diseases/chronic-diseases.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthProfile]),
    ChronicDiseasesModule,
  ],
  controllers: [HealthProfilesController],
  providers: [HealthProfilesService],
  exports: [HealthProfilesService],
})
export class HealthProfilesModule {}
