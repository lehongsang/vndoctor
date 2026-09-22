import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChronicDiseasesService } from './chronic-diseases.service';
import { ChronicDisease } from './entities/chronic-disease.entity';
import { ProfileChronicDisease } from './entities/profile-chronic-disease.entity';
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

  const mockProfileDisease: ProfileChronicDisease = {
    id: 'pcd-01',
    healthProfileId: 'profile-111',
    healthProfile: {} as unknown as ProfileChronicDisease['healthProfile'],
    diseaseIds: ['disease-01'],
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

  const mockProfileDiseaseRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChronicDiseasesService,
        {
          provide: getRepositoryToken(ChronicDisease),
          useValue: mockDiseaseRepo,
        },
        {
          provide: getRepositoryToken(ProfileChronicDisease),
          useValue: mockProfileDiseaseRepo,
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

  describe('setProfileDiseases', () => {
    it('should set chronic disease ids for a health profile', async () => {
      mockDiseaseRepo.count.mockResolvedValue(1);
      mockProfileDiseaseRepo.findOne.mockResolvedValue(null);
      mockProfileDiseaseRepo.create.mockReturnValue(mockProfileDisease);
      mockProfileDiseaseRepo.save.mockResolvedValue(mockProfileDisease);

      const result = await service.setProfileDiseases('profile-111', [
        'disease-01',
      ]);

      expect(result.healthProfileId).toBe('profile-111');
      expect(result.diseaseIds).toContain('disease-01');
    });

    it('should throw NotFound if any disease UUID does not exist', async () => {
      mockDiseaseRepo.count.mockResolvedValue(0);

      await expect(
        service.setProfileDiseases('profile-111', ['invalid-id']),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('getProfileDiseases', () => {
    it('should return disease objects with only 4 core fields', async () => {
      mockProfileDiseaseRepo.findOne.mockResolvedValue(mockProfileDisease);
      mockDiseaseRepo.find.mockResolvedValue([mockDisease]);

      const list = await service.getProfileDiseases('profile-111');
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        id: 'disease-01',
        code: 'HYPERTENSION',
        name: 'Tăng huyết áp vô căn (nguyên phát)',
        icd10Code: 'I10',
      });
    });

    it('should return empty array if no diseases assigned', async () => {
      mockProfileDiseaseRepo.findOne.mockResolvedValue(null);

      const list = await service.getProfileDiseases('profile-111');
      expect(list).toEqual([]);
    });
  });
});
