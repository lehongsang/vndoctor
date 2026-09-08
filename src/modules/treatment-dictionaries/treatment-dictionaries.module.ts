import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreatmentTargetDictionary } from './entities/treatment-target-dictionary.entity';
import { TreatmentDictionariesService } from './treatment-dictionaries.service';
import { TreatmentDictionariesController } from './treatment-dictionaries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TreatmentTargetDictionary])],
  controllers: [TreatmentDictionariesController],
  providers: [TreatmentDictionariesService],
  exports: [TreatmentDictionariesService],
})
export class TreatmentDictionariesModule {}
