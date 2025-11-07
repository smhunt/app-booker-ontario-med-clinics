/**
 * Notification Adapter Interface
 * Defines the contract for sending appointment confirmations and reminders
 *
 * CRITICAL: Never include PHI in notification content
 * Use appointment IDs and secure links only
 */

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface SmsOptions {
  to: string;
  message: string;
}

export interface VoiceOptions {
  to: string;
  script: string;
}

export interface INotificationAdapter {
  /**
   * Send email notification
   */
  sendEmail(options: EmailOptions): Promise<void>;

  /**
   * Send SMS notification
   */
  sendSMS(options: SmsOptions): Promise<void>;

  /**
   * Send voice notification (automated call)
   */
  sendVoice(options: VoiceOptions): Promise<void>;
}
