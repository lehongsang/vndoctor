import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { StaffUser } from './entities/staff-user.entity';
import {
  ChangeStaffPasswordDto,
  CreateStaffDto,
  QueryStaffDto,
  UpdateMyProfileDto,
  UpdateStaffDto,
} from './dtos';
import {
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  Unauthorized,
  ErrorCode,
} from '@/commons/exceptions';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';

@Injectable()
export class StaffService {
  public static readonly DEFAULT_STAFF_PASSWORD = 'vndoctor123';

  constructor(
    @InjectRepository(StaffUser)
    private readonly staffRepository: Repository<StaffUser>,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  /**
   * Registers a single staff/doctor account with automatic default password & email requirement.
   *
   * @param dto - Staff registration data.
   * @param creator - Authenticated creator info.
   * @returns Newly created staff entity (without password hash).
   */
  async createStaff(
    dto: CreateStaffDto,
    creator?: StaffJwtPayload,
  ): Promise<StaffUser> {
    // 1. Determine target facility ID based on creator scope
    let targetFacilityId = dto.facilityId;

    if (creator && creator.role !== StaffRole.VNDOCTOR_ADMIN && creator.facilityId) {
      if (dto.facilityId && dto.facilityId !== creator.facilityId) {
        throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      targetFacilityId = creator.facilityId;
    }

    if (!targetFacilityId && dto.role !== StaffRole.VNDOCTOR_ADMIN) {
      throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
    }

    // Verify facility exists and is active if facilityId provided
    if (targetFacilityId) {
      const facility = await this.facilitiesService.getFacilityById(targetFacilityId);
      if (!facility.isActive) {
        throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
      }
    }

    // 2. Resolve username: use provided username or email prefix
    let resolvedUsername = dto.username?.trim();
    if (!resolvedUsername) {
      const emailPrefix = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      resolvedUsername = emailPrefix;
    }

    // 3. Check for duplicates (staffCode, email, username)
    const existingCode = await this.staffRepository.findOne({
      where: { staffCode: dto.staffCode },
    });
    if (existingCode) {
      throw new Conflict(ErrorCode.STAFF_CODE_ALREADY_EXISTS);
    }

    const existingEmail = await this.staffRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new Conflict(ErrorCode.ACCOUNT_EMAIL_ALREADY_EXISTS);
    }

    const existingUsername = await this.staffRepository.findOne({
      where: { username: resolvedUsername },
    });
    if (existingUsername) {
      // If username from email is already taken, append staffCode
      resolvedUsername = `${resolvedUsername}_${dto.staffCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }

    // 4. Hash password (use provided password or default 'vndoctor123')
    const rawPassword = dto.password?.trim() || StaffService.DEFAULT_STAFF_PASSWORD;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // 5. Create and save staff
    const staff = this.staffRepository.create({
      ...dto,
      facilityId: targetFacilityId,
      username: resolvedUsername,
      email: dto.email.toLowerCase().trim(),
      role: dto.role || StaffRole.DOCTOR,
      passwordHash,
      isActive: true,
    });

    const saved = await this.staffRepository.save(staff);
    delete (saved as Partial<StaffUser>).passwordHash;
    return saved;
  }

  /**
   * Retrieves paginated list of medical staff with flexible filters.
   *
   * @param query - Query filter parameters.
   * @returns Paginated result list.
   */
  async getStaffList(
    query: QueryStaffDto,
  ): Promise<{ items: StaffUser[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.facility', 'facility');

    if (query.facilityId) {
      qb.andWhere('staff.facilityId = :facilityId', {
        facilityId: query.facilityId,
      });
    }

    if (query.role) {
      qb.andWhere('staff.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('staff.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(staff.fullName ILIKE :kw OR staff.username ILIKE :kw OR staff.staffCode ILIKE :kw OR staff.email ILIKE :kw OR staff.specialty ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('staff.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Finds staff by ID.
   *
   * @param id - Staff UUID.
   * @returns Staff user entity with facility details.
   */
  async getStaffById(id: string): Promise<StaffUser> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: ['facility'],
    });

    if (!staff) {
      throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
    }

    return staff;
  }

  /**
   * Finds staff by username or email including password hash (used for authentication).
   *
   * @param username - Staff username or email.
   * @returns Staff entity with passwordHash selected.
   */
  async findByUsernameWithPassword(username: string): Promise<StaffUser | null> {
    const cleanUsername = username.trim().toLowerCase();
    return this.staffRepository
      .createQueryBuilder('staff')
      .addSelect('staff.passwordHash')
      .leftJoinAndSelect('staff.facility', 'facility')
      .where('LOWER(staff.username) = :username OR LOWER(staff.email) = :username', {
        username: cleanUsername,
      })
      .getOne();
  }

  /**
   * Updates staff profile information (Admin operation).
   *
   * @param id - Staff UUID.
   * @param dto - Update payload.
   * @returns Updated staff entity.
   */
  async updateStaff(id: string, dto: UpdateStaffDto): Promise<StaffUser> {
    const staff = await this.getStaffById(id);

    if (dto.email && dto.email !== staff.email) {
      const emailExists = await this.staffRepository.findOne({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new Conflict(ErrorCode.ACCOUNT_EMAIL_ALREADY_EXISTS);
      }
      staff.email = dto.email.toLowerCase().trim();
    }

    Object.assign(staff, dto);
    return this.staffRepository.save(staff);
  }

  /**
   * Allows staff to self-update their own personal profile.
   *
   * @param id - Staff UUID.
   * @param dto - Editable profile fields.
   * @returns Updated staff entity.
   */
  async updateMyProfile(id: string, dto: UpdateMyProfileDto): Promise<StaffUser> {
    const staff = await this.getStaffById(id);

    if (dto.email && dto.email !== staff.email) {
      const emailExists = await this.staffRepository.findOne({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new Conflict(ErrorCode.ACCOUNT_EMAIL_ALREADY_EXISTS);
      }
      staff.email = dto.email.toLowerCase().trim();
    }

    if (dto.fullName) staff.fullName = dto.fullName;
    if (dto.specialty !== undefined) staff.specialty = dto.specialty;
    if (dto.phoneNumber !== undefined) staff.phoneNumber = dto.phoneNumber;

    return this.staffRepository.save(staff);
  }

  /**
   * Changes staff password after verifying the old password.
   *
   * @param id - Staff UUID.
   * @param dto - Old and new password.
   */
  async changePassword(
    id: string,
    dto: ChangeStaffPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const staff = await this.staffRepository
      .createQueryBuilder('staff')
      .addSelect('staff.passwordHash')
      .where('staff.id = :id', { id })
      .getOne();

    if (!staff) {
      throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, staff.passwordHash);
    if (!isMatch) {
      throw new Unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }

    const salt = await bcrypt.genSalt(10);
    staff.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    await this.staffRepository.save(staff);

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }
}

