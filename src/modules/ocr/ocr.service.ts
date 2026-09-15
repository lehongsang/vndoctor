import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BadRequest, CustomException, ErrorCode } from '@/commons/exceptions';
import { OcrPdfDto } from './dtos/ocr-pdf.dto';
import {
  OcrCccdResponse,
  OcrHealthResponse,
  OcrPdfResponse,
} from './interfaces/ocr.interface';

/**
 * Service chịu trách nhiệm giao tiếp với hệ thống Document Intelligence / OCR (https://ocr.vndoctor.vn).
 * Đóng gói dữ liệu multipart/form-data, xử lý timeout và chuẩn hóa kết quả trả về.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ocrServiceUrl = (
      this.configService.get<string>('OCR_SERVICE_URL') ||
      'https://ocr.vndoctor.vn'
    ).replace(/\/+$/, '');

    this.timeoutMs =
      this.configService.get<number>('OCR_TIMEOUT_MS') || 120000;
  }

  /**
   * Tiếp nhận tệp tin PDF hoặc ảnh bệnh án y tế, gửi sang OCR server để trích xuất cấu trúc dữ liệu JSON.
   *
   * @param file - File PDF hoặc Ảnh bệnh án do người dùng tải lên
   * @param options - Các tùy chọn bổ sung như force_ocr, dpi, lang, engine
   * @returns Kết quả trích xuất thông tin bệnh án y khoa
   */
  async processPdf(
    file?: Express.Multer.File,
    options?: OcrPdfDto,
  ): Promise<OcrPdfResponse> {
    // Bước 1: Kiểm tra tính hợp lệ của tệp tin đầu vào
    if (!file || !file.buffer) {
      throw new BadRequest(ErrorCode.FILE_REQUIRED, 'Vui lòng tải lên tệp tin PDF hoặc hình ảnh hồ sơ bệnh án');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequest(
        ErrorCode.FILE_TYPE_INVALID,
        `Định dạng tệp ${file.mimetype} không được hỗ trợ. Vui lòng tải lên file PDF hoặc định dạng ảnh (JPEG, PNG, WEBP, TIFF).`,
      );
    }

    // Bước 2: Đóng gói payload multipart/form-data
    const formData = new FormData();
    const fileBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', fileBlob, file.originalname || 'document.pdf');

    if (options?.force_ocr !== undefined) {
      formData.append('force_ocr', String(options.force_ocr));
    }
    if (options?.dpi !== undefined) {
      formData.append('dpi', String(options.dpi));
    }
    if (options?.lang) {
      formData.append('lang', options.lang);
    }
    if (options?.engine) {
      formData.append('engine', options.engine);
    }

    // Bước 3: Gửi HTTP POST request sang OCR service
    const targetUrl = `${this.ocrServiceUrl}/ocr/pdf`;
    this.logger.log(`Gửi yêu cầu OCR PDF tới ${targetUrl} (file: ${file.originalname}, size: ${file.size} bytes)`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<OcrPdfResponse>(targetUrl, formData, {
          timeout: this.timeoutMs,
          headers: {
            // Không set cứng Content-Type để FormData tự gắn boundary thích hợp
          },
        }),
      );

      // Bước 4: Kiểm tra và trả về kết quả cấu trúc
      return response.data;
    } catch (error: unknown) {
      this.handleOcrError(error, 'OCR PDF hồ sơ bệnh án');
    }
  }

  /**
   * Tiếp nhận ảnh CCCD/CMND 2 mặt để nhận diện thông tin và bóc tách dữ liệu định danh.
   *
   * @param frontFile - Ảnh mặt trước CCCD
   * @param backFile - Ảnh mặt sau CCCD
   * @returns Kết quả trích xuất thông tin CCCD
   */
  async processCccd(
    frontFile?: Express.Multer.File,
    backFile?: Express.Multer.File,
  ): Promise<OcrCccdResponse> {
    // Bước 1: Kiểm tra 2 mặt ảnh CCCD bắt buộc
    if (!frontFile || !frontFile.buffer) {
      throw new BadRequest(ErrorCode.FILE_REQUIRED, 'Vui lòng tải lên ảnh mặt trước của CCCD/CMND');
    }
    if (!backFile || !backFile.buffer) {
      throw new BadRequest(ErrorCode.FILE_REQUIRED, 'Vui lòng tải lên ảnh mặt sau của CCCD/CMND');
    }

    // Bước 2: Đóng gói payload multipart/form-data
    const formData = new FormData();
    const frontBlob = new Blob([new Uint8Array(frontFile.buffer)], { type: frontFile.mimetype });
    const backBlob = new Blob([new Uint8Array(backFile.buffer)], { type: backFile.mimetype });

    formData.append('front_file', frontBlob, frontFile.originalname || 'front.jpg');
    formData.append('back_file', backBlob, backFile.originalname || 'back.jpg');

    // Bước 3: Gửi HTTP POST request sang OCR service
    const targetUrl = `${this.ocrServiceUrl}/ocr/cccd`;
    this.logger.log(`Gửi yêu cầu OCR CCCD tới ${targetUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<OcrCccdResponse>(targetUrl, formData, {
          timeout: this.timeoutMs,
        }),
      );

      // Bước 4: Trả về kết quả
      return response.data;
    } catch (error: unknown) {
      this.handleOcrError(error, 'OCR CCCD');
    }
  }

  /**
   * Kiểm tra trạng thái hoạt động và các endpoint được hỗ trợ bởi hệ thống OCR từ xa.
   */
  async checkHealth(): Promise<OcrHealthResponse> {
    const targetUrl = `${this.ocrServiceUrl}/health`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<OcrHealthResponse>(targetUrl, {
          timeout: 10000,
        }),
      );
      return response.data;
    } catch (error: unknown) {
      this.handleOcrError(error, 'Health Check OCR Service');
    }
  }

  /**
   * Xử lý lỗi trả về từ external HTTP request sang OCR backend và chuẩn hóa thành CustomException.
   *
   * @param error - Đối tượng lỗi bắt được từ axios/http call
   * @param actionContext - Tên thao tác đang thực hiện để ghi log
   */
  private handleOcrError(error: unknown, actionContext: string): never {
    const errObj = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
      code?: string;
    };

    const status = errObj.response?.status;
    const responseData = errObj.response?.data;
    const errorMessage = errObj.message || 'Lỗi không xác định khi kết nối dịch vụ OCR';

    this.logger.error(
      `[${actionContext}] Thất bại: Status ${status || 'N/A'}, Error: ${errorMessage}`,
      JSON.stringify(responseData || {}),
    );

    if (status === 422) {
      throw new CustomException({
        statusCode: 422,
        errorCode: ErrorCode.UNPROCESSABLE_ENTITY,
        message: 'Dữ liệu tệp tải lên không hợp lệ hoặc OCR không thể phân tích cấu trúc tài liệu',
        context: actionContext,
      });
    }

    if (status && status >= 400 && status < 500) {
      throw new BadRequest(
        ErrorCode.BAD_REQUEST,
        `Yêu cầu OCR không hợp lệ (${status}): ${JSON.stringify(responseData || errorMessage)}`,
      );
    }

    if (errObj.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      throw new CustomException({
        statusCode: 504,
        errorCode: ErrorCode.GATEWAY_TIMEOUT,
        message: 'Hệ thống OCR xử lý quá thời gian quy định (Timeout). Vui lòng thử lại với tệp có dung lượng/số trang nhỏ hơn.',
        context: actionContext,
      });
    }

    throw new CustomException({
      statusCode: 502,
      errorCode: ErrorCode.OCR_FAILED,
      message: 'Không thể kết nối hoặc xử lý dữ liệu từ máy chủ OCR từ xa',
      context: actionContext,
    });
  }
}
