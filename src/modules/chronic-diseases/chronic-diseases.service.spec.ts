import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChronicDiseasesService } from './chronic-diseases.service';
import { ChronicDisease } from './entities/chronic-disease.entity';
import { Conflict, NotFound } from '@/commons/exceptions';

describe('ChronicDiseasesService', () => {
  let service: ChronicDiseasesService;

  const mockDisease: ChronicDisease = {
    id: 'disease-01',
    code: 'HYPERTENSION',
    name: 'Tăng huyết áp vô căn (nguyên phát)',
    icd10Code: 'I10',
    category: 'Tim mạch',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
  };

  const mockDiseaseRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChronicDiseasesService,
        {
          provide: getRepositoryToken(ChronicDisease),
          useValue: mockDiseaseRepo,
        },
      ],
    }).compile();

    service = module.get<ChronicDiseasesService>(ChronicDiseasesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createChronicDisease', () => {
    it('should create chronic disease successfully and return only id, code, name, icd10Code', async () => {
      mockDiseaseRepo.findOne.mockResolvedValue(null);
      mockDiseaseRepo.create.mockReturnValue(mockDisease);
      mockDiseaseRepo.save.mockResolvedValue(mockDisease);

      const result = await service.createChronicDisease({
        code: 'HYPERTENSION',
        name: 'Tăng huyết áp vô căn (nguyên phát)',
        icd10Code: 'I10',
        category: 'Tim mạch',
      });

      expect(result).toEqual({
        id: 'disease-01',
        code: 'HYPERTENSION',
        name: 'Tăng huyết áp vô căn (nguyên phát)',
        icd10Code: 'I10',
      });
      expect(mockDiseaseRepo.save).toHaveBeenCalled();
    });

    it('should throw Conflict when disease code already exists', async () => {
      mockDiseaseRepo.findOne.mockResolvedValue(mockDisease);

      await expect(
        service.createChronicDisease({
          code: 'HYPERTENSION',
          name: 'Tăng huyết áp',
        }),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('getChronicDiseaseById', () => {
    it('should return disease with only 4 fields (id, code, name, icd10Code)', async () => {
      mockDiseaseRepo.findOne.mockResolvedValue(mockDisease);

      const result = await service.getChronicDiseaseById('disease-01');
      expect(result).toEqual({
        id: 'disease-01',
        code: 'HYPERTENSION',
        name: 'Tăng huyết áp vô căn (nguyên phát)',
        icd10Code: 'I10',
      });
    });

    it('should throw NotFound if disease does not exist', async () => {
      mockDiseaseRepo.findOne.mockResolvedValue(null);

      await expect(service.getChronicDiseaseById('not-exist')).rejects.toThrow(NotFound);
    });
  });
});
