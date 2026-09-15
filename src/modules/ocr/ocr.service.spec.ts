import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BadRequest, CustomException, ErrorCode } from '@/commons/exceptions';
import { OcrService } from './ocr.service';
import type { OcrPdfDto } from './dtos';

describe('OcrService', () => {
  let service: OcrService;
  let httpService: jest.Mocked<HttpService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OCR_SERVICE_URL') return 'https://ocr.vndoctor.vn';
      if (key === 'OCR_TIMEOUT_MS') return 60000;
      return undefined;
    }),
  };

  const createMockAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const mockHttp = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttp,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPdf', () => {
    const mockPdfFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'benh_an_test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4 test content'),
      stream: null as unknown as Express.Multer.File['stream'],
      destination: '',
      filename: '',
      path: '',
    };

    it('should successfully send PDF and return parsed OCR medical data', async () => {
      const mockOcrResult = {
        success: true,
        data: {
          patient_name: 'NGUYEN VAN A',
          diagnosis: 'Viêm phế quản cấp',
          icd10_code: 'J20',
        },
        raw_text: 'BỆNH ÁN RA VIỆN...',
      };

      httpService.post.mockReturnValue(of(createMockAxiosResponse(mockOcrResult)));

      const dto: OcrPdfDto = {
        force_ocr: true,
        dpi: 200,
        lang: 'vie+eng',
        engine: 'rapidocr',
      };

      const result = await service.processPdf(mockPdfFile, dto);

      expect(result).toEqual(mockOcrResult);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://ocr.vndoctor.vn/ocr/pdf',
        expect.any(FormData),
        expect.objectContaining({ timeout: 60000 }),
      );
    });

    it('should throw BadRequest when file is missing or has empty buffer', async () => {
      await expect(service.processPdf(undefined)).rejects.toThrow(BadRequest);
      await expect(
        service.processPdf({ ...mockPdfFile, buffer: undefined } as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequest);
    });

    it('should throw BadRequest when file MIME type is not supported', async () => {
      const invalidFile: Express.Multer.File = {
        ...mockPdfFile,
        mimetype: 'application/zip',
      };

      await expect(service.processPdf(invalidFile)).rejects.toThrow(BadRequest);
    });

    it('should handle 422 Unprocessable Entity error', async () => {
      const errorResponse = {
        response: {
          status: 422,
          data: { detail: 'Cannot parse file structure' },
        },
        message: 'Request failed with status code 422',
      };

      httpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(service.processPdf(mockPdfFile)).rejects.toThrow(CustomException);
      await expect(service.processPdf(mockPdfFile)).rejects.toMatchObject({
        errorCode: ErrorCode.UNPROCESSABLE_ENTITY,
      });
    });

    it('should handle timeout error (504 Gateway Timeout)', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      };

      httpService.post.mockReturnValue(throwError(() => timeoutError));

      await expect(service.processPdf(mockPdfFile)).rejects.toThrow(CustomException);
      await expect(service.processPdf(mockPdfFile)).rejects.toMatchObject({
        errorCode: ErrorCode.GATEWAY_TIMEOUT,
      });
    });

    it('should handle 502/500 OCR server errors (502 OCR_FAILED)', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal OCR engine crash' },
        },
        message: 'Request failed with status code 500',
      };

      httpService.post.mockReturnValue(throwError(() => serverError));

      await expect(service.processPdf(mockPdfFile)).rejects.toThrow(CustomException);
      await expect(service.processPdf(mockPdfFile)).rejects.toMatchObject({
        errorCode: ErrorCode.OCR_FAILED,
      });
    });
  });

  describe('processCccd', () => {
    const mockFrontFile: Express.Multer.File = {
      fieldname: 'front_file',
      originalname: 'cccd_front.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 512,
      buffer: Buffer.from('front image bytes'),
      stream: null as unknown as Express.Multer.File['stream'],
      destination: '',
      filename: '',
      path: '',
    };

    const mockBackFile: Express.Multer.File = {
      fieldname: 'back_file',
      originalname: 'cccd_back.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 512,
      buffer: Buffer.from('back image bytes'),
      stream: null as unknown as Express.Multer.File['stream'],
      destination: '',
      filename: '',
      path: '',
    };

    it('should successfully process front and back CCCD files', async () => {
      const mockCccdResult = {
        success: true,
        data: {
          id_number: '012345678901',
          full_name: 'NGUYEN VAN A',
          dob: '01/01/1990',
        },
      };

      httpService.post.mockReturnValue(of(createMockAxiosResponse(mockCccdResult)));

      const result = await service.processCccd(mockFrontFile, mockBackFile);

      expect(result).toEqual(mockCccdResult);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://ocr.vndoctor.vn/ocr/cccd',
        expect.any(FormData),
        expect.objectContaining({ timeout: 60000 }),
      );
    });

    it('should throw BadRequest when front or back file is missing', async () => {
      await expect(service.processCccd(undefined, mockBackFile)).rejects.toThrow(BadRequest);
      await expect(service.processCccd(mockFrontFile, undefined)).rejects.toThrow(BadRequest);
    });
  });

  describe('checkHealth', () => {
    it('should return health status from OCR server', async () => {
      const mockHealth = {
        status: 'healthy',
        supported_apis: [{ endpoint: '/ocr/pdf', description: 'OCR PDF' }],
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockHealth)));

      const result = await service.checkHealth();
      expect(result).toEqual(mockHealth);
      expect(httpService.get).toHaveBeenCalledWith('https://ocr.vndoctor.vn/health', {
        timeout: 10000,
      });
    });
  });
});
