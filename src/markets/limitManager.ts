import { MarketMessage } from '@/markets/type';

function processMarket(market: MarketMessage, videogame: string, tournament_tier: string, config: any): MarketMessage {
  const template = market.template;

  let templateLimit = 1;
  let tournamentLimit = 1;
  let videogameLimit = 1;

  // Get the limits based on videogame and template
  if (config.marketLimits) {
    const videogameTemplateLimits = config.marketLimits[videogame];
    templateLimit =
      (videogameTemplateLimits && typeof videogameTemplateLimits !== 'number'
        ? videogameTemplateLimits[template]
        : undefined) ?? config.marketLimits['default'];
  }

  if (config.tournamentLimits) {
    tournamentLimit = config.tournamentLimits[tournament_tier] ?? config.tournamentLimits['default'];
  }
  if (config.videogameLimits) {
    videogameLimit = config.videogameLimits[videogame] ?? config.videogameLimits['default'];
    console.log(videogameLimit);
  }

  const computedLimit = (templateLimit as number) * tournamentLimit * videogameLimit;

  return {
    ...market,
    // Optional to change to desired new field in the message
    limit: computedLimit,
  };
}

export function calculateLimitsForMessage(message: any, config: any): any {
  const videogame = message.videogame_slug;
  const tournament_tier = message.tournament_tier;
  if (message.type === 'markets' && message.markets) {
    const processedMarkets = message.markets.map((market: MarketMessage) =>
      processMarket(market, videogame, tournament_tier, config),
    );
    return {
      ...message,
      markets: processedMarkets,
    };
  }
  return message;
}
