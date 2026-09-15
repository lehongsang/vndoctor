import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Doc } from '@/commons/docs/doc.decorator';
import { ApiFile, ApiFiles } from '@/commons/decorators/file-upload.decorator';
import { Public } from '@/commons/decorators/public.decorator';
import { CombinedAuthGuard } from '@/commons/guards/combined-auth.guard';
import { OcrCccdDto, OcrPdfDto } from './dtos';
import {
  OcrCccdResponse,
  OcrHealthResponse,
  OcrPdfResponse,
} from './interfaces/ocr.interface';
import { OcrService } from './ocr.service';

/**
 * Controller tiếp nhận các yêu cầu xử lý OCR Hồ sơ Bệnh án và Giấy tờ tuỳ thân.
 */
@ApiTags('OCR (Document Intelligence & Trích xuất Hồ sơ Bệnh án)')
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  /**
   * Endpoint OCR PDF Hồ sơ Bệnh án Y tế.
   */
  @Post('pdf')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiFile('file', OcrPdfDto, true)
  @Doc({
    summary: 'OCR & Trích xuất Hồ sơ Bệnh án từ PDF hoặc Hình ảnh',
    description:
      'Tiếp nhận file PDF/Ảnh hồ sơ bệnh án, gửi sang máy chủ OCR vndoctor.vn để trích xuất cấu trúc dữ liệu y khoa (thông tin bệnh nhân, chẩn đoán, sinh hiệu, kết quả xét nghiệm, đơn thuốc...)',
  })
  async processPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: OcrPdfDto,
  ): Promise<OcrPdfResponse> {
    return this.ocrService.processPdf(file, dto);
  }

  /**
   * Endpoint OCR Căn cước công dân (CCCD / CMND 2 mặt).
   */
  @Post('cccd')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiFiles(
    [
      { name: 'front_file', maxCount: 1 },
      { name: 'back_file', maxCount: 1 },
    ],
    OcrCccdDto,
    true,
  )
  @Doc({
    summary: 'OCR Căn cước công dân (CCCD 2 mặt)',
    description:
      'Tiếp nhận ảnh chụp CCCD/CMND mặt trước và mặt sau, nhận diện QR code và bóc tách thông tin cá nhân định danh.',
  })
  async processCccd(
    @UploadedFiles()
    files: {
      front_file?: Express.Multer.File[];
      back_file?: Express.Multer.File[];
    },
  ): Promise<OcrCccdResponse> {
    const frontFile = files?.front_file?.[0];
    const backFile = files?.back_file?.[0];
    return this.ocrService.processCccd(frontFile, backFile);
  }

  /**
   * Kiểm tra trạng thái hoạt động của hệ thống OCR.
   */
  @Get('health')
  @Public()
  @Doc({
    summary: 'Kiểm tra trạng thái kết nối tới máy chủ OCR',
    description:
      'Trả về tình trạng hoạt động (healthy) và danh sách các endpoint OCR được hỗ trợ.',
  })
  async checkHealth(): Promise<OcrHealthResponse> {
    return this.ocrService.checkHealth();
  }
}
