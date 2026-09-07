# Mail Implementation Patterns (BullMQ)

## 📂 Enqueueing a Mail Job
```typescript
// Inject MailQueueService into your service
constructor(private readonly mailQueueService: MailQueueService) {}

// Enqueue OTP job
await this.mailQueueService.enqueueSendOtp(email, otp);

// Enqueue Password Reset job
await this.mailQueueService.enqueueSendPasswordReset(email, resetUrl);

// Enqueue Verification Email job
await this.mailQueueService.enqueueSendVerificationEmail(email, verifyUrl);
```

## 🛠️ Processor: Handling BullMQ Jobs
```typescript
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case MailJobName.SendOtp:
        await this.mailService.sendOtp(job.data.email, job.data.otp);
        break;
      case MailJobName.SendPasswordReset:
        await this.mailService.sendPasswordReset(job.data.email, job.data.url);
        break;
      case MailJobName.SendVerificationEmail:
        await this.mailService.sendVerificationEmail(job.data.email, job.data.url);
        break;
    }
  }
}
```

## 📧 Service: SMTP Execution
```typescript
async sendMail(email: string, template: string, context: object) {
  await this.mailerService.sendMail({
    to: email,
    template: `./${template}`,
    context: {
      ...context,
      appName: 'VNDoctor',
      currentYear: new Date().getFullYear(),
    },
  });
}
```
