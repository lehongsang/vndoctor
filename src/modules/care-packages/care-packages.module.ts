import { Facility } from '@/modules/facilities/entities/facility.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarePackagesController } from './care-packages.controller';
import { CarePackagesService } from './care-packages.service';
import { CarePackage } from './entities/care-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CarePackage, Facility])],
  controllers: [CarePackagesController],
  providers: [CarePackagesService],
  exports: [CarePackagesService],
})
export class CarePackagesModule {}
