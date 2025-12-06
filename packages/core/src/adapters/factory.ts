import { IPosAdapter } from './pos/IPosAdapter';
import { MockPosAdapter } from './pos/MockPosAdapter';
import { FhirPosAdapter } from './pos/FhirPosAdapter';
import { INotificationAdapter } from './notifications/INotificationAdapter';
import { MockNotificationAdapter } from './notifications/MockNotificationAdapter';
import { TwilioAdapter } from './notifications/TwilioAdapter';
import { SendGridAdapter } from './notifications/SendGridAdapter';
import logger from '../utils/logger';

/**
 * Adapter Factory
 * Creates the appropriate adapter based on environment configuration
 */

export function createPosAdapter(): IPosAdapter {
  const adapterType = process.env.POS_ADAPTER || 'mock';

  logger.info(`Creating PoS adapter: ${adapterType}`);

  switch (adapterType.toLowerCase()) {
    case 'fhir':
      return new FhirPosAdapter();
    case 'mock':
    default:
      return new MockPosAdapter();
  }
}

export function createNotificationAdapter(): INotificationAdapter {
  const adapterType = process.env.NOTIFICATION_ADAPTER || 'mock';

  logger.info(`Creating notification adapter: ${adapterType}`);

  switch (adapterType.toLowerCase()) {
    case 'twilio':
      return new TwilioAdapter();
    case 'sendgrid':
      return new SendGridAdapter();
    case 'mock':
    default:
      return new MockNotificationAdapter();
  }
}
