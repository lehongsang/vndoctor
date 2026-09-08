import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChronicDisease } from './entities/chronic-disease.entity';
import { ProfileChronicDisease } from './entities/profile-chronic-disease.entity';
import { ChronicDiseasesService } from './chronic-diseases.service';
import { ChronicDiseasesController } from './chronic-diseases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChronicDisease, ProfileChronicDisease]),
  ],
  controllers: [ChronicDiseasesController],
  providers: [ChronicDiseasesService],
  exports: [ChronicDiseasesService],
})
export class ChronicDiseasesModule {}
