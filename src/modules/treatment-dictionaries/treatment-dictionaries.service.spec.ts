import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TreatmentDictionariesService } from './treatment-dictionaries.service';
import { TreatmentTargetDictionary } from './entities/treatment-target-dictionary.entity';
import { NotFound } from '@/commons/exceptions';

describe('TreatmentDictionariesService', () => {
  let service: TreatmentDictionariesService;

  const mockDictionary: TreatmentTargetDictionary = {
    code: 'A1',
    assessmentNotes: 'Tích cực thay đổi lối sống',
    assessmentTimeframe: 'Theo dõi Định kỳ 6 tháng/lần',
    bpTarget: '+ Huyết áp tâm thu: 120-129 mmHg',
    lipidTarget: 'LDL-C < 3.0 mmol/l',
    bmiTarget: 'BMI từ 20-23 tối ưu',
    glycemicTarget: null,
    renalTarget: 'Xét nghiệm chức năng thận',
    dietAdvice: 'Ăn dưới 5g muối/ngày',
    exerciseAdvice: '30 phút/ngày',
    smokingAdvice: 'Bỏ thuốc lá',
    notes: 'Bỏ thuốc lá',
    createdAt: new Date(),
  };

  const mockRepo = {
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn().mockImplementation((dto: Partial<TreatmentTargetDictionary>): TreatmentTargetDictionary => dto as TreatmentTargetDictionary),
    save: jest.fn().mockImplementation((entity: TreatmentTargetDictionary): Promise<TreatmentTargetDictionary> => Promise.resolve(entity)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.code === 'A1') return Promise.resolve(mockDictionary);
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockDictionary], 1]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentDictionariesService,
        {
          provide: getRepositoryToken(TreatmentTargetDictionary),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TreatmentDictionariesService>(TreatmentDictionariesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated dictionaries', async () => {
      const result = await service.findAll({ search: 'A1', page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].code).toBe('A1');
    });
  });

  describe('findOne', () => {
    it('should return dictionary item by code', async () => {
      const result = await service.findOne('a1');
      expect(result.code).toBe('A1');
      expect(result.bpTarget).toContain('120-129');
    });

    it('should throw NotFound if code does not exist', async () => {
      await expect(service.findOne('Z99')).rejects.toThrow(NotFound);
    });
  });
});
