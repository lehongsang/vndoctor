import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';

export interface PatientLinkSseEvent {
  accountId: string;
  type: 'patient_link_invitation' | 'patient_link_status_changed';
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Service managing Server-Sent Events (SSE) for patient link invitations and status updates.
 */
@Injectable()
export class PatientLinksSseService {
  private readonly logger = new Logger(PatientLinksSseService.name);
  private readonly events$ = new Subject<PatientLinkSseEvent>();

  /**
   * Subscribe to SSE event stream for a specific patient app account.
   *
   * @param accountId - Target patient account UUID
   * @returns Observable emitting MessageEvent
   */
  subscribe(accountId: string): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      filter((event) => event.accountId === accountId),
      map((event) => ({
        type: event.type,
        data: {
          type: event.type,
          data: event.data,
          timestamp: event.timestamp,
        },
      } as MessageEvent)),
    );
  }

  /**
   * Emit a new patient link invitation event to a specific account.
   *
   * @param accountId - Target patient account UUID
   * @param data - Invitation payload
   */
  emitInvitation(accountId: string, data: Record<string, unknown>): void {
    this.logger.log(`Emitting patient_link_invitation to account: ${accountId}`);
    this.events$.next({
      accountId,
      type: 'patient_link_invitation',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a status change event (e.g. accepted, rejected, unlinked) to a specific account.
   *
   * @param accountId - Target patient account UUID
   * @param data - Status change payload
   */
  emitStatusChange(accountId: string, data: Record<string, unknown>): void {
    this.logger.log(`Emitting patient_link_status_changed to account: ${accountId}`);
    this.events$.next({
      accountId,
      type: 'patient_link_status_changed',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
