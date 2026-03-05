import { EventEmitter } from 'node:events';
import { SDKConfig, SDKOptions } from '@/config';
import { setupLogger } from '@/utils/logger';
import { Matches } from '@/matches';

interface Notification {
  type: string;
  code: number;
  message: string;
  recoveryData?: any;
}

class EventHandler extends EventEmitter {
  private config: SDKOptions;
  private disconnectionStartTime: string | null = null;
  private reconnected: boolean = false;
  private heartbeatTimerId: NodeJS.Timeout | null = null;
  private logger: any;

  constructor() {
    super();
    const config = SDKConfig.getInstance().getConfig();
    if (!config) {
      throw new Error('SDK configuration is not set.');
    }
    this.config = config;
    this.logger = setupLogger(this.config);
  }

  public startDisconnectionTimer(): void {
    if (this.heartbeatTimerId !== null) {
      clearTimeout(this.heartbeatTimerId);
      this.heartbeatTimerId = null;
    }
    // Single timer covering 3 missed heartbeats (3 × 10s = 30s).
    // Each heartbeat resets this timer, so it only fires when no
    // heartbeat has arrived for 30 consecutive seconds.
    this.heartbeatTimerId = setTimeout(() => {
      this.heartbeatTimerId = null;
      this.startDisconnectionProcedure();
    }, 30000);
  }

  public handleHeartbeat(): void {
    if (this.disconnectionStartTime) {
      this.handleReconnection();
    }
    this.startDisconnectionTimer();
  }

  private startDisconnectionProcedure(): void {
    if (!this.disconnectionStartTime) {
      this.disconnectionStartTime = new Date().toISOString();
      const notification: Notification = {
        type: 'disconnection',
        code: 100,
        message: `Disconnection detected at ${this.disconnectionStartTime}.`,
      };
      this.logger.warn(notification.message); // Log disconnection warning
      this.emit('notification', notification);
    }
  }

  public async handleReconnection(): Promise<void> {
    if (this.disconnectionStartTime && !this.reconnected) {
      this.reconnected = true;
      const reconnectionTime = new Date().toISOString();
      
      // Check if recovery/backfill is enabled (default: true)
      const shouldRecover = this.config.recoverOnReconnect !== false;
      
      try {
        let recoveryData: any = null;
        let modifiedMatches: any = null;

        if (shouldRecover) {
          // Perform backfill only if enabled
          recoveryData = await Matches.recoverMarkets(this.disconnectionStartTime);
          modifiedMatches = await Matches.fetchMatchesRange(this.disconnectionStartTime, reconnectionTime, true);
        }

        const reconnectionNotification: Notification = {
          type: 'reconnection',
          code: 101,
          message: `Reconnection successful at ${reconnectionTime}.`,
          recoveryData: shouldRecover ? {
            markets: recoveryData,
            modifiedMatches: modifiedMatches,
          } : undefined,
        };
        this.emit('notification', reconnectionNotification);
        this.logger.info(reconnectionNotification.message);
      } catch (error) {
        this.logger.error('Error during recovery process:', error);
      } finally {
        this.disconnectionStartTime = null;
        this.reconnected = false;
      }
    }
  }

  public resetReconnectionStatus(): void {
    this.reconnected = false;
  }
}

export default EventHandler;