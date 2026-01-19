import { LoggerMethods } from '@/utils/logger';

interface SDKOptions {
  apiToken: string;
  company_id: number;
  email: string;
  password: string;
  queues: {
    queueName: string;
    routingKey: string;
  }[];
  oddsFormat?: OddsFormat[];
  apiBaseURL: string;
  feedHost: string;
  logging?: {
    directory: string;
  };
  customLogger?: LoggerMethods; // New: Allow custom logger injection
  recoverOnReconnect?: boolean; // New: Toggle backfill/recovery on reconnect (default: true)
  realTimeBetLogConfig?: {
    vhost: string;
    email: string;
    password: string;
    protocol?: string;
    hostname: string;
    port?: number;
  };
}

interface RabbitMQConnectConfiguration {
  protocol: string;
  hostname: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
}

type OddsFormat = 'american' | 'fractional';
type OddsFormatString = `odds_${OddsFormat}_with_overround`;

const oddsFormatsList: OddsFormat[] = ['american', 'fractional'];

class SDKConfig {
  private static instance: SDKConfig;
  private config: SDKOptions | null = null;

  public static getInstance(): SDKConfig {
    if (!SDKConfig.instance) {
      SDKConfig.instance = new SDKConfig();
    }
    return SDKConfig.instance;
  }

  public setConfig(config: SDKOptions) {
    // Set default value for recoverOnReconnect if not provided
    if (config.recoverOnReconnect === undefined) {
      config.recoverOnReconnect = true;
    }
    this.config = config;
  }

  public getConfig(): SDKOptions | null {
    if (this.config != null) {
      if (this.config.realTimeBetLogConfig != null) {
        this.config.realTimeBetLogConfig.protocol = this.config.realTimeBetLogConfig.protocol || 'amqps';
        this.config.realTimeBetLogConfig.port = this.config.realTimeBetLogConfig.port || 5671;
      }
    }
    return this.config;
  }
}

export { SDKConfig, SDKOptions, OddsFormat, OddsFormatString, RabbitMQConnectConfiguration, oddsFormatsList };