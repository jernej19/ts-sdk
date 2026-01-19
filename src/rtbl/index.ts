import * as amqplib from 'amqplib';
import { Channel, Connection } from 'amqplib';
import { SDKConfig, SDKOptions } from '@/config';

export interface BetData {
  event_type: 'bet_placed';
  bet: {
    id: string;
    type: 'single' | 'multi' | 'system' | string; // Added string for additional types
    user_id: string;
    cash_amount: number;
    free_bet_amount?: number;
    currency: string;
    placed_at: string;
    selections_combinations_count?: number;
    selections: Array<{
      provider: string;
      provider_market_id?: string;
      provider_selection_position?: number;
      decimal_odds: number;
      is_banker?: boolean;
    }>;
  };
}

class RTBL {
  private static connection: Connection | null = null;
  private static channel: Channel | null = null;
  private static config: SDKOptions | null = SDKConfig.getInstance().getConfig();

  private static RABBITMQ_EXCHANGE = 'incoming-bets';
  private static RABBITMQ_EXCHANGE_TYPE = 'direct';
  private static RABBITMQ_ROUTING_KEY = '#';

  public static async connectToRabbitMQ(): Promise<void> {
    this.config = SDKConfig.getInstance().getConfig();
    if (!this.config || !this.config.realTimeBetLogConfig) {
      throw new Error('RTBL is not set.');
    }

    console.log(`Connecting to ${this.config.realTimeBetLogConfig.hostname}...`);

    const { email, password, hostname, vhost } = this.config.realTimeBetLogConfig;
    const rabbitmqServerUrl = `amqps://${encodeURIComponent(email)}:${password}@${hostname}/${encodeURIComponent(vhost)}`;

    this.connection = await amqplib.connect(rabbitmqServerUrl);
    console.log('Connected to RabbitMQ');
  }

  public static async createChannel(): Promise<void> {
    if (!this.connection) throw new Error('Connection not established');
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.RABBITMQ_EXCHANGE, this.RABBITMQ_EXCHANGE_TYPE, { durable: true });
    console.log('Channel and exchange setup complete');
  }

  public static validateBetData(betData: BetData): string[] {
    const errors: string[] = [];
    const { type, selections } = betData.bet;

    if (type === 'single' && selections.length !== 1) {
      errors.push(`Invalid bet data for ${betData.bet.id}. Single bets should have exactly 1 selection.`);
    } else if (type === 'multi' && selections.length < 2) {
      errors.push(`Invalid bet data for ${betData.bet.id}. Multi bets should have at least 2 selections.`);
    } else if (
      type === 'system' &&
      (!betData.bet.selections_combinations_count || typeof betData.bet.selections_combinations_count !== 'number')
    ) {
      errors.push(
        `Invalid bet data for ${betData.bet.id}. System bets require a 'selections_combinations_count' field.`,
      );
    }

    return errors;
  }

  public static modifyBetDataSelections(betData: BetData): void {
    betData.bet.selections = betData.bet.selections.map((selection) => {
      if (selection.provider === 'external') {
        // If provider is external, remove optional fields
        const { provider, decimal_odds } = selection;
        return { provider, decimal_odds };
      } else {
        // If provider is not external, ensure mandatory fields
        const { provider, provider_market_id, provider_selection_position, decimal_odds } = selection;
        if (!provider_market_id || !provider_selection_position) {
          throw new Error(
            'Invalid bet data: provider_market_id and provider_selection_position are mandatory for PandaScore selections.',
          );
        }
        return {
          provider,
          provider_market_id,
          provider_selection_position,
          decimal_odds,
        };
      }
    });
  }

  public static publishBet(
    betData: BetData,
    errorCallback: (error: Error) => void,
    successCallback: (betData: BetData) => void,
  ): void {
    console.log('Publishing bet data:', JSON.stringify(betData, null, 2));

    const errors = this.validateBetData(betData);
    if (errors.length > 0) {
      errorCallback(new Error(`Validation errors: ${errors.join(', ')}`));
      return;
    }

    this.modifyBetDataSelections(betData);

    if (!this.channel) {
      errorCallback(new Error('Channel not established'));
      return;
    }

    const message = Buffer.from(JSON.stringify(betData));
    try {
      this.channel.publish(this.RABBITMQ_EXCHANGE, this.RABBITMQ_ROUTING_KEY, message, { persistent: true });
      console.log('Bet Published Successfully');
      successCallback(betData);
    } catch (err) {
      // Check if err is an instance of Error
      if (err instanceof Error) {
        errorCallback(new Error(`Publishing failed: ${err.message}`));
      } else {
        // Handle the case where err is not an Error instance
        errorCallback(new Error('Publishing failed and the error could not be identified'));
      }
    }
  }
}

export { RTBL };
