import {
  INotificationAdapter,
  EmailOptions,
  SmsOptions,
  VoiceOptions,
} from './INotificationAdapter';
import logger from '../../utils/logger';

/**
 * Twilio Notification Adapter (Stub for Future Implementation)
 *
 * TODO(integration): Install twilio SDK: npm install twilio
 * TODO(legal): Obtain legal approval for live notifications
 * TODO(security): Store Twilio credentials securely (not in code)
 */
export class TwilioAdapter implements INotificationAdapter {
  private accountSid: string;
  private authToken: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';

    if (!this.accountSid || !this.authToken) {
      logger.warn('TwilioAdapter: Missing credentials (stub mode)');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    logger.warn('TwilioAdapter.sendEmail called (stub) - use SendGridAdapter for email');
    throw new Error('TwilioAdapter does not support email. Use SendGridAdapter.');
  }

  async sendSMS(options: SmsOptions): Promise<void> {
    logger.warn('TwilioAdapter.sendSMS called (stub)', {
      to: options.to.slice(-4),
    });

    throw new Error(
      'TwilioAdapter not implemented. Use MockNotificationAdapter or complete Twilio integration.'
    );

    // Future implementation:
    // const client = twilio(this.accountSid, this.authToken);
    // await client.messages.create({
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: options.to,
    //   body: options.message,
    // });
  }

  async sendVoice(options: VoiceOptions): Promise<void> {
    logger.warn('TwilioAdapter.sendVoice called (stub)', {
      to: options.to.slice(-4),
    });

    throw new Error(
      'TwilioAdapter not implemented. Use MockNotificationAdapter or complete Twilio integration.'
    );
  }
}
