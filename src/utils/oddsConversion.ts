import type { OddsFormat } from '@/config';

class OddsConverter {
  static convertToUSOdds(oddsDecimalWithOverround: number): number | null {
    if (!oddsDecimalWithOverround || oddsDecimalWithOverround <= 1) {
      return null;
    }

    if (oddsDecimalWithOverround >= 2.0) {
      return Math.round((oddsDecimalWithOverround - 1) * 100);
    } else {
      return Math.round(-100 / (oddsDecimalWithOverround - 1));
    }
  }

  static convertToUKOdds(oddsDecimalWithOverround: number): string | null {
    if (!oddsDecimalWithOverround || oddsDecimalWithOverround <= 1) {
      return null;
    }

    const fractionalOdds = oddsDecimalWithOverround - 1;
    let numerator = Math.round(fractionalOdds * 100);
    let denominator = 100;
    const gcd = OddsConverter.findGCD(numerator, denominator);

    numerator /= gcd;
    denominator /= gcd;

    return `${numerator}/${denominator}`;
  }

  static findGCD(a: number, b: number): number {
    return b === 0 ? a : OddsConverter.findGCD(b, a % b);
  }
}

function convertProbabilityToOdds(oddsDecimalWithOverround: number, format: 'american'): number | null;
function convertProbabilityToOdds(oddsDecimalWithOverround: number, format: 'fractional'): string | null;
function convertProbabilityToOdds(oddsDecimalWithOverround: number, format: OddsFormat): string | number | null;
function convertProbabilityToOdds(oddsDecimalWithOverround: number, format: OddsFormat): string | number | null {
  switch (format) {
    case 'american':
      return OddsConverter.convertToUSOdds(oddsDecimalWithOverround);
    case 'fractional':
      return OddsConverter.convertToUKOdds(oddsDecimalWithOverround);
  }
}

export { convertProbabilityToOdds };
