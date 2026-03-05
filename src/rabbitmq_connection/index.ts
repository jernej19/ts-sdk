import * as amqp from 'amqplib';
import { SDKConfig, SDKOptions } from '@/config';
import EventHandler from '@/events';
import { setupLogger } from '@/utils/logger';
import { calculateLimitsForMessage } from '@/markets/limitManager';
import { enrichSelectionsWithOdds } from '@/utils/oddsUtils';

class RMQFeed {
  private static config: SDKOptions | null = SDKConfig.getInstance().getConfig();
  private static connection: amqp.Connection | null = null;
  private static channel: amqp.Channel | null = null;
  private static exchangeName = 'pandascore.feed';
  private static logger: any;
  private static eventHandler: EventHandler;
  private static isReconnecting = false;
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static consecutiveFailures = 0;
  private static readonly MAX_CONNECTIONS_WARNING_THRESHOLD = 5;

  private static async cleanupExistingConnection(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close().catch(() => {});
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close().catch(() => {});
        this.connection = null;
      }
    } catch {
      // Ignore cleanup errors — connection may already be dead
      this.channel = null;
      this.connection = null;
    }
  }

  public static async initializeRabbitMQ(eventHandler?: EventHandler): Promise<void> {
    this.config = SDKConfig.getInstance().getConfig();
    if (!this.config) {
      throw new Error('SDK configuration is not set.');
    }

    // Prevent duplicate initialization if already connected
    if (this.connection) {
      this.logger?.info('RabbitMQ connection already exists, skipping initialization.');
      return;
    }

    // Use provided eventHandler or create a new one
    this.eventHandler = eventHandler || new EventHandler();
    this.logger = setupLogger(this.config);
    const { company_id, email, password, feedHost } = this.config;
    const vhost = `odds/${company_id}`;
    const rabbitmqServerUrl = `amqps://${encodeURIComponent(email)}:${password}@${feedHost}/${encodeURIComponent(vhost)}`;

    try {
      this.connection = await amqp.connect(rabbitmqServerUrl);
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.channel = await this.connection.createChannel();
      await this.createQueuesAndExchanges();
      this.logger.info('Connected to RabbitMQ');
      this.eventHandler.startDisconnectionTimer(); // Start the heartbeat timer for disconnection detection
    } catch (error: any) {
      this.consecutiveFailures++;
      this.logger.warn('Error connecting to RabbitMQ:', error.message);
      this.retryConnection();
    }
  }

  private static async createQueuesAndExchanges(): Promise<void> {
    if (this.channel && this.config?.queues) {
      for (const queueConfig of this.config.queues) {
        const { queueName, routingKey } = queueConfig;
        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
        await this.channel.bindQueue(queueName, this.exchangeName, routingKey || '#');
      }
    }
  }

  private static handleConnectionError(err: Error): void {
    this.logger.error(`Connection error: ${err.message}`);
    this.retryConnection();
  }

  public static async startConsumingMessages(
    handleMessageCallback: (msg: any) => void,
    options?: Record<string, never>,
  ): Promise<void> {
    if (!this.channel || !this.config?.queues) {
      this.logger.warn('Channel or queues configuration is not available, skipping consumer start.');
      return;
    }

    for (const queueConfig of this.config.queues) {
      const { queueName } = queueConfig;
      const consumerTag = `${this.config!.email}_${queueName}`; // Unique consumer tag per queue

      this.channel.consume(
        queueName,
        async (msg) => {
          if (msg !== null) {
            try {
              let message = JSON.parse(msg.content.toString());

              // Any message from RabbitMQ proves the connection is alive
              this.eventHandler.handleHeartbeat();

              // Check if this is a heartbeat message (has 'at' property and no 'type')
              const isHeartbeat = message.at && Object.keys(message).length === 1;
              if (isHeartbeat) {
                this.logger.debug('Received heartbeat message:', message);

                // Acknowledge the heartbeat message
                this.channel!.ack(msg);
                return; // Don't forward heartbeats to user callback
              }

              // For non-heartbeat messages, process normally
              // Enrich message markets with the selected odds formats from the config
              if (message.markets) {
                const oddsFormats = this.config?.oddsFormat || [];
                message.markets = enrichSelectionsWithOdds(message.markets, oddsFormats);
              }

              // Apply limits if necessary
              message =
                this.config && options && options.addLimits ? calculateLimitsForMessage(message, undefined) : message;

              handleMessageCallback(message);

              // Log the received message (non-heartbeats)
              if (Object.prototype.hasOwnProperty.call(message, 'type')) {
                this.logger.debug('Received message from RabbitMQ:', message);
              }

              // Acknowledge the message
              this.channel!.ack(msg);
            } catch (err: any) {
              this.logger.error('Error processing message:', err.message);

              // Reject the message
              this.channel!.reject(msg, false);
            }
          }
        },
        { consumerTag }, // Assign the unique consumer tag here
      );
    }

    this.channel.on('close', this.handleChannelClose.bind(this));
    this.channel.on('error', this.handleChannelError.bind(this));
    this.logger.info('Consumer started.');
  }

  private static async handleChannelClose(): Promise<void> {
    this.logger.warn('Channel closed, reconnecting...');
    this.retryConnection();
  }

  private static async handleChannelError(error: Error): Promise<void> {
    this.logger.warn('Channel error:', error.message);
    this.retryConnection();
  }

  private static retryConnection(): void {
    if (this.isReconnecting) {
      this.logger.debug('Reconnection already in progress, skipping duplicate retry.');
      return;
    }
    this.isReconnecting = true;

    // Clear any pending reconnect timer to avoid stacking retries
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.logger.info('Attempting to reconnect in 5 seconds...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectRabbitMQ();
    }, 5000);
  }

  private static handleMessage = (message: any): void => {
    if (!message) {
      this.logger.error('Received null message.');
      return;
    }

    try {
      const fullMessage = JSON.stringify(message, null, 2);
      console.log('Received message from RabbitMQ:', fullMessage);
    } catch (err: any) {
      this.logger.error('Error processing message:', err.message);
    }
  };

  private static async connectRabbitMQ(): Promise<void> {
    if (!this.config) {
      throw new Error('SDK configuration is not set.');
    }

    // Close any existing connection before creating a new one
    await this.cleanupExistingConnection();

    const { company_id, email, password, feedHost } = this.config;
    const vhost = `odds/${company_id}`;
    const rabbitmqServerUrl = `amqps://${encodeURIComponent(email)}:${password}@${feedHost}/${encodeURIComponent(vhost)}`;

    try {
      this.connection = await amqp.connect(rabbitmqServerUrl);
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.channel = await this.connection.createChannel();
      await this.createQueuesAndExchanges();
      this.logger.info('Connected to RabbitMQ');
      this.isReconnecting = false; // Reset guard on success
      this.consecutiveFailures = 0; // Reset failure counter on success
      this.eventHandler.handleReconnection(); // Call handleReconnection when connected
      this.eventHandler.startDisconnectionTimer(); // Restart timer after reconnection
      await this.startConsumingMessages(this.handleMessage, {});
    } catch (error: any) {
      this.consecutiveFailures++;
      this.logger.error('Error connecting to RabbitMQ:', error.message);

      if (this.consecutiveFailures >= this.MAX_CONNECTIONS_WARNING_THRESHOLD) {
        this.logger.warn(
          `RabbitMQ connection has failed ${this.consecutiveFailures} consecutive times. ` +
            'This may indicate the connection limit has been reached on the server. ' +
            'Please verify your RabbitMQ connection limits and ensure no leaked connections exist.',
        );
      }

      this.isReconnecting = false; // Reset guard so next retry can proceed
      this.retryConnection();
    }
  }
  /** @internal — exposed for testing only */
  public static _resetForTest(): void {
    this.connection = null;
    this.channel = null;
    this.isReconnecting = false;
    this.consecutiveFailures = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** @internal — exposed for testing only */
  public static _getState() {
    return {
      isReconnecting: this.isReconnecting,
      consecutiveFailures: this.consecutiveFailures,
      connection: this.connection,
      channel: this.channel,
      reconnectTimer: this.reconnectTimer,
    };
  }
}

export { RMQFeed };