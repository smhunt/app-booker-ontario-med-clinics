import {
  INotificationAdapter,
  EmailOptions,
  SmsOptions,
  VoiceOptions,
} from './INotificationAdapter';
import logger from '../../utils/logger';

/**
 * SendGrid Email Adapter (Stub for Future Implementation)
 *
 * TODO(integration): Install sendgrid SDK: npm install @sendgrid/mail
 * TODO(legal): Obtain legal approval for live email notifications
 * TODO(security): Store SendGrid API key securely
 */
export class SendGridAdapter implements INotificationAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('SendGridAdapter: Missing API key (stub mode)');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    logger.warn('SendGridAdapter.sendEmail called (stub)', {
      to: options.to.substring(0, 3) + '***',
      subject: options.subject,
    });

    throw new Error(
      'SendGridAdapter not implemented. Use MockNotificationAdapter or complete SendGrid integration.'
    );

    // Future implementation:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.apiKey);
    // await sgMail.send({
    //   from: process.env.SENDGRID_FROM_EMAIL,
    //   to: options.to,
    //   subject: options.subject,
    //   html: renderTemplate(options.template, options.data),
    // });
  }

  async sendSMS(_options: SmsOptions): Promise<void> {
    logger.warn('SendGridAdapter.sendSMS called - use TwilioAdapter for SMS');
    throw new Error('SendGridAdapter does not support SMS. Use TwilioAdapter.');
  }

  async sendVoice(_options: VoiceOptions): Promise<void> {
    logger.warn('SendGridAdapter.sendVoice called - use TwilioAdapter for voice');
    throw new Error('SendGridAdapter does not support voice. Use TwilioAdapter.');
  }
}
