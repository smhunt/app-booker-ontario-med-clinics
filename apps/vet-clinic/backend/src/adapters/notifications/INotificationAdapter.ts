/**
 * Notification Adapter Interface
 * Sends appointment confirmations and reminders via email/SMS/voice
 */

export interface EmailPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface SMSPayload {
  to: string;
  message: string;
}

export interface VoicePayload {
  to: string;
  script: string;
}

export interface INotificationAdapter {
  /**
   * Send email notification
   */
  sendEmail(payload: EmailPayload): Promise<void>;

  /**
   * Send SMS notification
   */
  sendSMS(payload: SMSPayload): Promise<void>;

  /**
   * Send voice call notification
   */
  sendVoice(payload: VoicePayload): Promise<void>;
}
