import { INotificationAdapter, EmailPayload, SMSPayload, VoicePayload } from './INotificationAdapter';
import logger from '../../utils/logger';

/**
 * Twilio Notification Adapter (Stub)
 * Future integration with Twilio for SMS and Voice
 *
 * TODO(integration): Implement real Twilio client when API keys are available
 * TODO(legal): Review notification content with legal counsel before production
 */
export class TwilioAdapter implements INotificationAdapter {
  constructor() {
    logger.warn('TwilioAdapter: Using stub implementation - not connected to real Twilio');
  }

  async sendEmail(_payload: EmailPayload): Promise<void> {
    logger.warn('TwilioAdapter: sendEmail not supported - use SendGrid for email');
  }

  async sendSMS(payload: SMSPayload): Promise<void> {
    logger.info('TwilioAdapter: sendSMS (stub)', {
      to: '[REDACTED]',
      messageLength: payload.message.length,
    });
  }

  async sendVoice(payload: VoicePayload): Promise<void> {
    logger.info('TwilioAdapter: sendVoice (stub)', {
      to: '[REDACTED]',
      scriptLength: payload.script.length,
    });
  }
}
