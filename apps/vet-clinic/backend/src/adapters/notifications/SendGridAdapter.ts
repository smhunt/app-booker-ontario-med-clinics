import { INotificationAdapter, EmailPayload, SMSPayload, VoicePayload } from './INotificationAdapter';
import logger from '../../utils/logger';

/**
 * SendGrid Notification Adapter (Stub)
 * Future integration with SendGrid for email
 *
 * TODO(integration): Implement real SendGrid client when API keys are available
 * TODO(legal): Review email templates with legal counsel before production
 */
export class SendGridAdapter implements INotificationAdapter {
  constructor() {
    logger.warn('SendGridAdapter: Using stub implementation - not connected to real SendGrid');
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    logger.info('SendGridAdapter: sendEmail (stub)', {
      to: '[REDACTED]',
      subject: payload.subject,
      template: payload.template,
    });
  }

  async sendSMS(_payload: SMSPayload): Promise<void> {
    logger.warn('SendGridAdapter: sendSMS not supported - use Twilio for SMS');
  }

  async sendVoice(_payload: VoicePayload): Promise<void> {
    logger.warn('SendGridAdapter: sendVoice not supported - use Twilio for voice');
  }
}
