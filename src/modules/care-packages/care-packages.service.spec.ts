import { CarePackageStatus, CarePackageType } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CarePackagesService } from './care-packages.service';
import { CarePackage } from './entities/care-package.entity';

describe('CarePackagesService', () => {
  let service: CarePackagesService;

  const mockFacility: Partial<Facility> = {
    id: 'facility-1',
    facilityName: 'Bệnh viện Đa khoa Quốc tế',
  };

  const mockCarePackage: Partial<CarePackage> = {
    id: 'pkg-1',
    facilityId: 'facility-1',
    code: 'PKG-CARDIO-30D',
    name: 'Gói Chăm Sóc Tim Mạch 30 Ngày',
    type: CarePackageType.STANDARD,
    durationDays: 30,
    priceAmount: 1500000,
    status: CarePackageStatus.ACTIVE,
  };

  const mockCarePackageRepo = {
    create: jest.fn().mockImplementation((dto: Partial<CarePackage>): CarePackage => dto as CarePackage),
    save: jest.fn().mockImplementation((entity: Partial<CarePackage>): Promise<CarePackage> => Promise.resolve({ id: 'pkg-1', ...entity } as CarePackage)),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'pkg-1' || options.where.code === 'PKG-CARDIO-30D') {
        return Promise.resolve({ ...mockCarePackage });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCarePackage], 1]),
    }),
  };

  const mockFacilityRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'facility-1') {
        return Promise.resolve({ ...mockFacility });
      }
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarePackagesService,
        {
          provide: getRepositoryToken(CarePackage),
          useValue: mockCarePackageRepo,
        },
        {
          provide: getRepositoryToken(Facility),
          useValue: mockFacilityRepo,
        },
      ],
    }).compile();

    service = module.get<CarePackagesService>(CarePackagesService);
  });

  describe('create', () => {
    it('should create a care package successfully', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce(null); // No duplicate code

      const result = await service.create(
        {
          code: 'PKG-DIABETES-60D',
          name: 'Gói Chăm Sóc Đái Tháo Đường',
          type: CarePackageType.VIP,
          durationDays: 60,
          priceAmount: 3000000,
        },
        'facility-1',
      );

      expect(result).toBeDefined();
      expect(result.code).toBe('PKG-DIABETES-60D');
      expect(mockCarePackageRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFound if facility does not exist', async () => {
      mockFacilityRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          {
            code: 'PKG-NEW',
            name: 'Gói Mới',
            durationDays: 30,
            priceAmount: 1000000,
          },
          'invalid-facility',
        ),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Conflict if code already exists', async () => {
      mockFacilityRepo.findOne.mockResolvedValueOnce({ ...mockFacility });
      mockCarePackageRepo.findOne.mockResolvedValueOnce({ ...mockCarePackage });

      await expect(
        service.create(
          {
            code: 'PKG-CARDIO-30D',
            name: 'Trùng mã',
            durationDays: 30,
            priceAmount: 1000000,
          },
          'facility-1',
        ),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('findAll', () => {
    it('should return paginated care packages', async () => {
      const result = await service.findAll({
        facilityId: 'facility-1',
        status: CarePackageStatus.ACTIVE,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return care package if exists', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce({ ...mockCarePackage });

      const result = await service.findById('pkg-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('pkg-1');
    });

    it('should throw NotFound if not found', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFound);
    });
  });

  describe('update', () => {
    it('should update care package successfully without code change', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce({ ...mockCarePackage }); // findById

      const result = await service.update(
        'pkg-1',
        {
          name: 'Tên gói cập nhật',
          priceAmount: 2000000,
        },
        'facility-1',
      );

      expect(result).toBeDefined();
      expect(mockCarePackageRepo.save).toHaveBeenCalled();
    });

    it('should update care package successfully with new unique code', async () => {
      mockCarePackageRepo.findOne
        .mockResolvedValueOnce({ ...mockCarePackage }) // findById
        .mockResolvedValueOnce(null); // code check

      const result = await service.update(
        'pkg-1',
        {
          code: 'PKG-CARDIO-NEW',
        },
        'facility-1',
      );

      expect(result).toBeDefined();
      expect(mockCarePackageRepo.save).toHaveBeenCalled();
    });

    it('should throw Forbidden if editing another facility package', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce({ ...mockCarePackage, facilityId: 'facility-1' });

      await expect(
        service.update('pkg-1', { name: 'Hack' }, 'facility-other'),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('updateStatus', () => {
    it('should update care package status successfully', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce({ ...mockCarePackage });

      const result = await service.updateStatus('pkg-1', CarePackageStatus.INACTIVE, 'facility-1');
      expect(result).toBeDefined();
      expect(mockCarePackageRepo.save).toHaveBeenCalled();
    });
  });
});
