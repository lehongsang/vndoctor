# Asynchronous Mail System (BullMQ-Driven)

High-performance, queue-driven mailing system using NestJS Mailer and BullMQ with Redis.

## 🏗️ 1. Architecture (Queue-Driven)
- **Producer / Queue**: API modules NEVER send mail directly synchronously. They use `MailQueueService` to enqueue jobs to the `mail` BullMQ queue.
- **Consumer / Processor**: `MailProcessor` (`@Processor('mail')`) listens for jobs and calls `MailService` to perform SMTP sending asynchronously.
- **Why**: Ensures API responsiveness and handles retries/failures gracefully without blocking the client.

## ✉️ 2. Job Names & Payloads
Mail jobs follow defined types in `src/services/mail/mail-queue.types.ts`:
- `MailJobName.SendOtp`: `{ email, otp, expiresInMinutes }`
- `MailJobName.SendPasswordReset`: `{ email, url }`
- `MailJobName.SendVerificationEmail`: `{ email, url }`

## 🛡️ 3. Error Handling & Retries
- Configured with exponential backoff and automatic retries in `MailQueueService`.
- Failed jobs are retained with `removeOnFail` for debugging.

## 🎨 4. Templates (Handlebars)
- Files live in `src/services/mail/templates/*.hbs`.
- Pass `appName` and `currentYear` in the template context for consistent branding.

## 🔗 5. References
- [MAIL.md](./references/MAIL.md) (Implementation Patterns)
