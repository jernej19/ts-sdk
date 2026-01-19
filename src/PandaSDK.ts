import { SDKConfig, SDKOptions } from '@/config';
import { RMQFeed } from '@/rabbitmq_connection';
import { Matches, Match } from '@/matches';
import { RTBL, BetData } from '@/rtbl';
import { EnrichedMarket } from '@/utils/oddsUtils';
import EventHandler from '@/events';

class PandaSDK {
  public events: EventHandler;

  private constructor(eventHandler: EventHandler) {
    this.events = eventHandler;
  }

  public static initialize(options: SDKOptions): PandaSDK {
    SDKConfig.getInstance().setConfig(options);
    
    // Create EventHandler instance to expose events
    const eventHandler = new EventHandler();
    
    const instance = new PandaSDK(eventHandler);
    return instance;
  }

  // Betting endpoints

  public fetchMatch(id: string): Promise<Match> {
    return Matches.fetchMatch(id);
  }

  public fetchMatchesRange(startTimestamp: string, endTimestamp: string): Promise<Match[]> {
    return Matches.fetchMatchesRange(startTimestamp, endTimestamp);
  }

  public fetchMarkets(id: string): Promise<Match> {
    return Matches.fetchMarkets(id);
  }
  
  public recoverMarkets(disconnectionTime: string): Promise<EnrichedMarket[]> {
    return Matches.recoverMarkets(disconnectionTime);
  }

  // RMQ Feed

  public async getRMQFeed(handleMessageCallback: (msg: any) => void, options?: Record<string, never>): Promise<void> {
    await RMQFeed.initializeRabbitMQ(this.events);
    RMQFeed.startConsumingMessages(handleMessageCallback, options);
  }

  // RTBL
  public async connectToRabbitMQ(): Promise<void> {
    await RTBL.connectToRabbitMQ();
  }

  public async createChannel(): Promise<void> {
    await RTBL.createChannel();
  }

  public publishBet(
    betData: BetData,
    errorCallback: (error: Error) => void,
    successCallback: (betData: BetData) => void,
  ): void {
    RTBL.publishBet(betData, errorCallback, successCallback);
  }
}

export { PandaSDK };