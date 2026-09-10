import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Account } from './entities/account.entity';
import { RegisterAppAccountDto } from './dtos/account.dto';
import { Conflict, NotFound, ErrorCode } from '@/commons/exceptions';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  /**
   * Registers a new patient mobile app account.
   *
   * @param dto - Account registration data.
   * @returns Newly created account.
   */
  async register(dto: RegisterAppAccountDto): Promise<Account> {
    const existing = await this.accountRepository.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existing) {
      throw new Conflict(ErrorCode.ACCOUNT_PHONE_ALREADY_EXISTS);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const account = this.accountRepository.create({
      phoneNumber: dto.phoneNumber,
      passwordHash,
      email: dto.email || null,
      isActive: true,
    });

    const saved = await this.accountRepository.save(account);
    delete (saved as Partial<Account>).passwordHash;
    return saved;
  }

  /**
   * Finds account by phone number with password hash included.
   *
   * @param phoneNumber - Patient mobile phone number.
   * @returns Account with passwordHash selected.
   */
  async findByPhoneNumberWithPassword(phoneNumber: string): Promise<Account | null> {
    return this.accountRepository
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.phoneNumber = :phoneNumber', { phoneNumber })
      .getOne();
  }

  /**
   * Gets account profile by ID.
   *
   * @param id - Account UUID.
   * @returns Account profile without passwordHash.
   */
  async getAccountById(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['healthProfiles'],
    });

    if (!account) {
      throw new NotFound(ErrorCode.ACCOUNT_NOT_FOUND);
    }

    return account;
  }
}

