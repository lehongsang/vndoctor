/* eslint-disable no-console */
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Account } from '@/modules/accounts/entities/account.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { FacilityPatientLink } from '@/modules/patient-links/entities/facility-patient-link.entity';
import { CarePackage } from '@/modules/care-packages/entities/care-package.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { HealthRecord } from '@/modules/health-records/entities/health-record.entity';
import {
  CarePackageStatus,
  CarePackageType,
  CareSubscriptionStatus,
  ConversationStatus,
  ConversationType,
  FacilityPatientLinkStatus,
  FacilityType,
  HealthMetricType,
  MessageType,
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
  SenderType,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';

async function runSeed() {
  console.log('🌱 [Seed] Initializing DataSource connection...');
  await dataSource.initialize();
  console.log('✅ [Seed] Connected to database successfully.');

  console.log('🔨 [Seed] Synchronizing database tables schema...');
  await dataSource.synchronize();
  console.log('✅ [Seed] Tables schema synchronized.');

  const facilityRepo = dataSource.getRepository(Facility);
  const staffRepo = dataSource.getRepository(StaffUser);
  const accountRepo = dataSource.getRepository(Account);
  const profileRepo = dataSource.getRepository(HealthProfile);
  const linkRepo = dataSource.getRepository(FacilityPatientLink);
  const packageRepo = dataSource.getRepository(CarePackage);
  const subscriptionRepo = dataSource.getRepository(PatientCareSubscription);
  const conversationRepo = dataSource.getRepository(Conversation);
  const messageRepo = dataSource.getRepository(Message);
  const recordRepo = dataSource.getRepository(HealthRecord);

  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Medical Facility
  console.log('🏥 [1/7] Seeding Medical Facility...');
  let facility = await facilityRepo.findOne({ where: { facilityCode: 'HOSP-VNDOCTOR' } });
  if (!facility) {
    facility = facilityRepo.create({
      facilityCode: 'HOSP-VNDOCTOR',
      facilityName: 'Bệnh viện Đa khoa Quốc tế VNDoctor',
      facilityType: FacilityType.PROVINCIAL_HOSPITAL,
      address: '123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      phoneNumber: '02839998888',
      isActive: true,
    });
    facility = await facilityRepo.save(facility);
    console.log(`   Created Facility: ${facility.facilityName} (${facility.id})`);
  } else {
    console.log(`   Facility already exists: ${facility.facilityName}`);
  }

  // 2. Seed Staff Accounts (Admin, Doctor, Nurse, Technician)
  console.log('👨‍⚕️ [2/7] Seeding Staff Accounts for each role...');
  const staffList = [
    {
      staffCode: 'ADMIN-001',
      username: 'staff_admin',
      fullName: 'Quản trị viên Bệnh viện',
      role: StaffRole.ADMIN,
      specialty: 'Ban Giám đốc / IT Y tế',
      email: 'admin@hospital.vndoctor.vn',
      phoneNumber: '0901000001',
    },
    {
      staffCode: 'DOC-001',
      username: 'dr_nguyenvanan',
      fullName: 'BS. CKII Nguyễn Văn An',
      role: StaffRole.DOCTOR,
      specialty: 'Tim mạch Can thiệp & Nội tiết',
      email: 'dr.an@vndoctor.vn',
      phoneNumber: '0901000002',
    },
    {
      staffCode: 'NURSE-001',
      username: 'nurse_tranthimai',
      fullName: 'ĐD. Trần Thị Mai',
      role: StaffRole.NURSE,
      specialty: 'Điều dưỡng Chăm sóc Tim mạch',
      email: 'nurse.mai@vndoctor.vn',
      phoneNumber: '0901000003',
    },
    {
      staffCode: 'TECH-001',
      username: 'tech_leminhtri',
      fullName: 'KTV. Lê Minh Trí',
      role: StaffRole.TECHNICIAN,
      specialty: 'Chẩn đoán Hình ảnh & Xét nghiệm',
      email: 'tech.tri@vndoctor.vn',
      phoneNumber: '0901000004',
    },
  ];

  const createdStaffMap = new Map<StaffRole, StaffUser>();

  for (const s of staffList) {
    let staffUser = await staffRepo.findOne({ where: { username: s.username } });
    if (!staffUser) {
      staffUser = staffRepo.create({
        facilityId: facility.id,
        staffCode: s.staffCode,
        username: s.username,
        passwordHash: hashedPassword,
        fullName: s.fullName,
        role: s.role,
        specialty: s.specialty,
        email: s.email,
        phoneNumber: s.phoneNumber,
        isActive: true,
      });
      staffUser = await staffRepo.save(staffUser);
      console.log(`   Created Staff [${s.role}]: ${s.fullName} (${s.username})`);
    } else {
      console.log(`   Staff exists [${s.role}]: ${s.fullName} (${s.username})`);
    }
    createdStaffMap.set(s.role, staffUser);
  }

  // 3. Seed Mobile App Patient Account
  console.log('📱 [3/7] Seeding Patient Mobile App Account...');
  let appAccount = await accountRepo.findOne({ where: { phoneNumber: '0987654321' } });
  if (!appAccount) {
    appAccount = accountRepo.create({
      phoneNumber: '0987654321',
      email: 'benhnhan@gmail.com',
      passwordHash: hashedPassword,
      isActive: true,
    });
    appAccount = await accountRepo.save(appAccount);
    console.log(`   Created App Account: ${appAccount.phoneNumber} (${appAccount.id})`);
  } else {
    console.log(`   App Account exists: ${appAccount.phoneNumber}`);
  }

  // 4. Seed Health Profile for Patient
  console.log('👤 [4/7] Seeding Patient Health Profile...');
  let healthProfile = await profileRepo.findOne({
    where: { accountId: appAccount.id, relationship: ProfileRelationship.SELF },
  });
  if (!healthProfile) {
    healthProfile = profileRepo.create({
      accountId: appAccount.id,
      fullName: 'Nguyễn Văn Bệnh Nhân',
      relationship: ProfileRelationship.SELF,
      dob: '1985-05-20',
      gender: ProfileGender.MALE,
      citizenId: '079185001234',
      phoneNumber: '0987654321',
      address: '456 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      bloodType: ProfileBloodType.O,
      allergy: 'Không dị ứng thuốc hoặc thức ăn',
      medicalHistory: 'Tiền sử Tăng huyết áp 3 năm, đang duy trì thuốc định kỳ',
    });
    healthProfile = await profileRepo.save(healthProfile);
    console.log(`   Created Health Profile: ${healthProfile.fullName} (${healthProfile.id})`);
  } else {
    console.log(`   Health Profile exists: ${healthProfile.fullName}`);
  }

  // Link Patient Profile with Hospital
  let patientLink = await linkRepo.findOne({
    where: { healthProfileId: healthProfile.id, facilityId: facility.id },
  });
  if (!patientLink) {
    patientLink = linkRepo.create({
      healthProfileId: healthProfile.id,
      facilityId: facility.id,
      phoneNumber: '0987654321',
      hospitalPatientCode: 'BN-2026-0001',
      status: FacilityPatientLinkStatus.ACTIVE,
      linkedAt: new Date(),
    });
    patientLink = await linkRepo.save(patientLink);
    console.log(`   Created Hospital Link: Mã BN ${patientLink.hospitalPatientCode}`);
  }

  // 5. Seed Care Packages (Standard & VIP)
  console.log('📦 [5/7] Seeding Care Packages...');
  let packageStandard = await packageRepo.findOne({ where: { code: 'PKG-CARDIO-STANDARD' } });
  if (!packageStandard) {
    packageStandard = packageRepo.create({
      facilityId: facility.id,
      name: 'Gói Chăm sóc Tim mạch & Huyết áp Toàn diện',
      code: 'PKG-CARDIO-STANDARD',
      type: CarePackageType.STANDARD,
      durationDays: 30,
      priceAmount: 500000,
      description: 'Theo dõi chỉ số huyết áp hằng ngày, tư vấn dinh dưỡng và hỗ trợ y tế chuyên khoa trong 30 phút.',
      status: CarePackageStatus.ACTIVE,
    });
    packageStandard = await packageRepo.save(packageStandard);
    console.log(`   Created Care Package: ${packageStandard.name}`);
  }

  let packageVip = await packageRepo.findOne({ where: { code: 'PKG-VIP-247' } });
  if (!packageVip) {
    packageVip = packageRepo.create({
      facilityId: facility.id,
      name: 'Gói Chăm sóc Cao cấp VIP 24/7',
      code: 'PKG-VIP-247',
      type: CarePackageType.VIP,
      durationDays: 90,
      priceAmount: 2500000,
      description: 'Đội ngũ Bác sĩ chuyên khoa và Điều dưỡng riêng chăm sóc sát sao 24/7, ưu tiên hội chẩn khẩn cấp.',
      status: CarePackageStatus.ACTIVE,
    });
    packageVip = await packageRepo.save(packageVip);
    console.log(`   Created Care Package: ${packageVip.name}`);
  }

  // 6. Seed Active Subscription, Care Team & Conversation Chat Room
  console.log('💬 [6/7] Seeding Active Subscription & Care Team Chat Room...');
  let subscription = await subscriptionRepo.findOne({
    where: { healthProfileId: healthProfile.id, status: CareSubscriptionStatus.ACTIVE },
  });

  const doctor = createdStaffMap.get(StaffRole.DOCTOR);
  const nurse = createdStaffMap.get(StaffRole.NURSE);

  if (!subscription) {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    subscription = subscriptionRepo.create({
      healthProfileId: healthProfile.id,
      carePackageId: packageStandard.id,
      assignedDoctorId: doctor?.id ?? null,
      assignedNurseId: nurse?.id ?? null,
      status: CareSubscriptionStatus.ACTIVE,
      startedAt,
      expiresAt,
    });
    subscription = await subscriptionRepo.save(subscription);
    console.log(`   Created Active Subscription ID: ${subscription.id}`);

    // Create Care Team Room
    let careTeamRoom = await conversationRepo.findOne({
      where: { subscriptionId: subscription.id },
    });

    if (!careTeamRoom) {
      careTeamRoom = conversationRepo.create({
        type: ConversationType.CARE_TEAM,
        status: ConversationStatus.ACTIVE,
        subscriptionId: subscription.id,
        facilityId: facility.id,
        healthProfileId: healthProfile.id,
        title: `Care Team - ${healthProfile.fullName} (${packageStandard.name})`,
      });
      careTeamRoom = await conversationRepo.save(careTeamRoom);
      console.log(`   Created Care Team Chat Room ID: ${careTeamRoom.id}`);

      // Seed Welcome messages
      const welcomeMsg = messageRepo.create({
        conversationId: careTeamRoom.id,
        senderType: SenderType.SYSTEM,
        senderUserId: null,
        messageType: MessageType.SYSTEM,
        content: `🎉 Chào mừng bệnh nhân ${healthProfile.fullName} đã tham gia ${packageStandard.name}. Đội ngũ bác sĩ và điều dưỡng đã sẵn sàng hỗ trợ bạn!`,
      });
      await messageRepo.save(welcomeMsg);

      if (doctor) {
        const docMsg = messageRepo.create({
          conversationId: careTeamRoom.id,
          senderType: SenderType.STAFF,
          senderUserId: doctor.id,
          messageType: MessageType.TEXT,
          content: `Chào bạn, tôi là ${doctor.fullName}. Tôi sẽ đồng hành theo dõi huyết áp và các chỉ số sức khỏe của bạn trong đợt điều trị này.`,
        });
        await messageRepo.save(docMsg);
      }
    }
  } else {
    console.log(`   Active subscription already exists: ${subscription.id}`);
  }

  // 7. Seed Sample Health Metric Records
  console.log('📊 [7/7] Seeding Health Records (Blood pressure, heart rate)...');
  const existingRecordsCount = await recordRepo.count({
    where: { healthProfileId: healthProfile.id },
  });

  if (existingRecordsCount === 0) {
    const sampleRecord = recordRepo.create({
      healthProfileId: healthProfile.id,
      metricType: HealthMetricType.BLOOD_PRESSURE,
      valueNumeric: 125,
      secondaryValue: 82,
      unit: 'mmHg',
      note: 'Đo sau khi nghỉ ngơi 15 phút vào buổi sáng.',
      measuredAt: new Date(),
    });
    await recordRepo.save(sampleRecord);
    console.log('   Created Sample Health Record (125/82 mmHg).');
  }

  console.log('\n======================================================');
  console.log('🎉🎉 SEEDING COMPLETED SUCCESSFULLY! 🎉🎉');
  console.log('======================================================');
  console.log('📋 TÀI KHOẢN ĐĂNG NHẬP MẪU:');
  console.log('------------------------------------------------------');
  console.log('🔐 1. STAFF CMS (Đăng nhập tại /api/v1/auth/staff/login):');
  console.log(`   - ADMIN:       username: staff_admin     | pass: ${defaultPassword}`);
  console.log(`   - DOCTOR:      username: dr_nguyenvanan  | pass: ${defaultPassword}`);
  console.log(`   - NURSE:       username: nurse_tranthimai| pass: ${defaultPassword}`);
  console.log(`   - TECHNICIAN:  username: tech_leminhtri  | pass: ${defaultPassword}`);
  console.log('------------------------------------------------------');
  console.log('📱 2. PATIENT APP (Đăng nhập tại /api/v1/auth/app/login):');
  console.log(`   - Bệnh nhân:  phone: 0987654321         | pass: ${defaultPassword}`);
  console.log(`   - Hồ sơ:      ${healthProfile.fullName} (Mã BN: BN-2026-0001)`);
  console.log('======================================================\n');

  await dataSource.destroy();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ [Seed] Error running seed script:', err);
  process.exit(1);
});
