import {
  INotificationAdapter,
  EmailOptions,
  SmsOptions,
  VoiceOptions,
} from './INotificationAdapter';
import logger from '../../utils/logger';
import { maskEmail, maskPhone } from '../../utils/redactor';

/**
 * Mock Notification Adapter
 * Logs notifications to console instead of sending real messages
 * Safe for development and testing
 */
export class MockNotificationAdapter implements INotificationAdapter {
  async sendEmail(options: EmailOptions): Promise<void> {
    logger.info('MockNotificationAdapter: Email sent (simulated)', {
      to: maskEmail(options.to),
      subject: options.subject,
      template: options.template,
      // Don't log data - may contain PHI
    });

    // In real implementation, this would queue the email
    console.log('📧 Mock Email:', {
      to: maskEmail(options.to),
      subject: options.subject,
      template: options.template,
    });
  }

  async sendSMS(options: SmsOptions): Promise<void> {
    logger.info('MockNotificationAdapter: SMS sent (simulated)', {
      to: maskPhone(options.to),
      messageLength: options.message.length,
    });

    console.log('📱 Mock SMS:', {
      to: maskPhone(options.to),
      message: options.message,
    });
  }

  async sendVoice(options: VoiceOptions): Promise<void> {
    logger.info('MockNotificationAdapter: Voice call sent (simulated)', {
      to: maskPhone(options.to),
      scriptLength: options.script.length,
    });

    console.log('📞 Mock Voice Call:', {
      to: maskPhone(options.to),
      script: options.script,
    });
  }
}
