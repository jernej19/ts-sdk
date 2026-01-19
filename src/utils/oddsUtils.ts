import { convertProbabilityToOdds } from '@/utils/oddsConversion';
import { type OddsFormat, type OddsFormatString } from '@/config';

interface Selection extends Partial<Record<OddsFormatString, string | number | null>> {
  odds_decimal_with_overround: number;
}

interface Market {
  selections: Selection[];
}

interface EnrichedMarket extends Market {
  [key: string]: any;
}

// Update the function signature to accept both markets and oddsFormats
function enrichSelectionsWithOdds(markets: Market[], oddsFormats: OddsFormat[]): EnrichedMarket[] {
  return markets.map((market) => ({
    ...market,
    selections: market.selections.map((selection) => {
      const enrichedSelection: Selection = { ...selection };

      // Add only the selected odds formats from the user's config without modifying odds_decimal_with_overround
      oddsFormats.forEach((format) => {
        const oddsFieldName: OddsFormatString = `odds_${format}_with_overround`;
        const convertedOdds = convertProbabilityToOdds(selection.odds_decimal_with_overround, format);
        enrichedSelection[oddsFieldName] = convertedOdds;
      });

      return enrichedSelection;
    }),
  }));
}

export { enrichSelectionsWithOdds, Market, EnrichedMarket };
