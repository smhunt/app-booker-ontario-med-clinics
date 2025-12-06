import { INotificationAdapter, EmailPayload, SMSPayload, VoicePayload } from './INotificationAdapter';
import logger from '../../utils/logger';

/**
 * Mock Notification Adapter
 * Logs notifications instead of sending them - for development and testing
 *
 * CRITICAL: Never include PII in actual notification content
 */
export class MockNotificationAdapter implements INotificationAdapter {
  async sendEmail(payload: EmailPayload): Promise<void> {
    logger.info('MockNotificationAdapter: Email notification', {
      to: '[REDACTED]',
      subject: payload.subject,
      template: payload.template,
    });

    // In development, log full payload for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📧 Email Notification (Mock):');
      console.log(`   To: ${payload.to}`);
      console.log(`   Subject: ${payload.subject}`);
      console.log(`   Template: ${payload.template}`);
      console.log(`   Data:`, payload.data);
      console.log('');
    }
  }

  async sendSMS(payload: SMSPayload): Promise<void> {
    logger.info('MockNotificationAdapter: SMS notification', {
      to: '[REDACTED]',
      messageLength: payload.message.length,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('\n📱 SMS Notification (Mock):');
      console.log(`   To: ${payload.to}`);
      console.log(`   Message: ${payload.message}`);
      console.log('');
    }
  }

  async sendVoice(payload: VoicePayload): Promise<void> {
    logger.info('MockNotificationAdapter: Voice notification', {
      to: '[REDACTED]',
      scriptLength: payload.script.length,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('\n📞 Voice Notification (Mock):');
      console.log(`   To: ${payload.to}`);
      console.log(`   Script: ${payload.script}`);
      console.log('');
    }
  }
}
