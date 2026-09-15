import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

/**
 * Module quản lý các chức năng OCR / Document Intelligence.
 */
@Module({
  imports: [
    HttpModule.register({
      maxRedirects: 5,
    }),
  ],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
