import axios, { AxiosResponse } from 'axios';
import { SDKConfig, SDKOptions } from '@/config';
import { enrichSelectionsWithOdds, EnrichedMarket, Market } from '@/utils/oddsUtils';
import { setupLogger } from '@/utils/logger';
import { LoggerMethods } from '@/utils/logger';

interface TopLevelObj {
  id: number;
  markets: Market[];
}

interface Match {}

class Matches {
  private static config: SDKOptions | null = SDKConfig.getInstance().getConfig();
  private static loggerInstance: LoggerMethods | null = null;

  // Lazy initialization of logger
  private static get logger(): LoggerMethods {
    if (!this.loggerInstance) {
      this.config = SDKConfig.getInstance().getConfig();
      this.loggerInstance = setupLogger(this.config);
    }
    return this.loggerInstance;
  }

  private static ensureConfig(): SDKOptions {
    if (!this.config) {
      this.config = SDKConfig.getInstance().getConfig();
    }
    if (!this.config || !this.config.apiToken) {
      throw new Error('API token is not set.');
    }
    return this.config;
  }

  public static async fetchMatch(id: string): Promise<any> {
    const config = this.ensureConfig();
    try {
      this.logger.info(`Fetching match with ID ${id}`); // Normal usage log
      const response: AxiosResponse<Match> = await axios.get(`${config.apiBaseURL}/${id}?token=${config.apiToken}`);

      this.logger.debug(`Response data for match ${id}: ${JSON.stringify(response.data, null, 2)}`); // Log detailed response data in debug
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching match with ID ${id}: ${error.message}`); // Log error in error.log
      throw error;
    }
  }

  public static async fetchMatchesRange(
    startTimestamp: string,
    endTimestamp: string,
    duringDisconnection: boolean = false,
  ): Promise<Match[]> {
    const config = this.ensureConfig();
    const formattedURL = `${config.apiBaseURL}?range[modified_at]=${startTimestamp},${endTimestamp}&filter[booked]=true&token=${config.apiToken}`;

    // Differentiate log messages based on disconnection context
    if (duringDisconnection) {
      this.logger.info(`Disconnection recovery: Fetching matches from ${startTimestamp} to ${endTimestamp}`);
    } else {
      this.logger.debug(`Fetching matches for range ${startTimestamp} to ${endTimestamp}`); // Normal usage log
    }

    try {
      const response = await axios.get<Match[]>(formattedURL);

      if (!response.data || response.data.length === 0) {
        this.logger.debug('No matches found for the given time range.');
      } else {
        const logMessage = `Matches recovery API Response: ${JSON.stringify(response.data, null, 2)}`;

        // Log detailed data in debug for both cases
        this.logger.debug(logMessage);
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching modified matches: ${error.message}`); // Log error in error.log
      throw error;
    }
  }

  public static async fetchMarkets(matchId: string): Promise<EnrichedMarket[]> {
    const config = this.ensureConfig();
    try {
      this.logger.info(`Fetching markets for match ${matchId}`); // Normal usage log
      const response: AxiosResponse<{ games: { markets: Market[] }[] }> = await axios.get(
        `${config.apiBaseURL}/${matchId}/markets?token=${config.apiToken}`,
      );
      const marketsData = response.data.games.flatMap((game) => game.markets);
      const oddsFormats = config.oddsFormat || [];
      const enrichedMarkets = enrichSelectionsWithOdds(marketsData, oddsFormats);
      this.logger.info(`Markets API Response for match ${matchId}: ${JSON.stringify(enrichedMarkets, null, 2)}`);
      return enrichedMarkets;
    } catch (error: any) {
      this.logger.error(`Error fetching markets for match ${matchId}: ${error.message}`); // Log error in error.log
      throw error;
    }
  }

  public static async recoverMarkets(disconnectionTime: string): Promise<EnrichedMarket[]> {
    const config = this.ensureConfig();
    try {
      this.logger.info(`Recovering markets since disconnection at ${disconnectionTime}`); // Recovery log for customer context
      const response = await axios.get<TopLevelObj[]>(
        `${config.apiBaseURL}/recover_markets/${disconnectionTime}?token=${config.apiToken}`,
      );

      const marketsData = response.data.flatMap((topLevelObj) => topLevelObj.markets);
      const oddsFormats = config.oddsFormat || [];
      const enrichedMarkets = enrichSelectionsWithOdds(marketsData, oddsFormats);
      this.logger.debug(`Recovering markets after disconnection: ${JSON.stringify(enrichedMarkets, null, 2)}`);
      return enrichedMarkets;
    } catch (error: any) {
      // Log error in error.log
      if (axios.isAxiosError(error)) {
        this.logger.error(`Error recovering markets: ${error.message}`);
      } else if (error instanceof Error) {
        this.logger.error(`Error recovering markets: ${error.message}`);
      } else {
        this.logger.error('An unknown error occurred during market recovery.');
      }
      throw error;
    }
  }
}

export { Matches, Match };