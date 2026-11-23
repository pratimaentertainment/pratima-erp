import 'dotenv/config';
import { logger } from './logger';

export function validateEnvironment() {
  const env = (process.env.NODE_ENV as string) || 'development';
  logger.info(`Validating environment for: ${env}`);

  if (env === 'production') {
    const pwd = process.env.SUPER_ADMIN_PASSWORD;
    if (!pwd || pwd.length < 8) {
      logger.error('CRITICAL: SUPER_ADMIN_PASSWORD is missing or too weak for production environment.');
      process.exit(1);
    }
  }

  return {
    isProduction: env === 'production',
    isStaging: env === 'staging',
    isDevelopment: env === 'development',
    includeSampleData: process.env.INCLUDE_SAMPLE_DATA === 'true',
  };
}
