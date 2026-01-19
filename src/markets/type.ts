export interface MarketMessage {
  videogame: string;
  template: string;
  tournament_tier: string;
  selections: Selection[];
  limit?: number; // Optional field for the computed limit
}

interface Selection {
  probability_with_overround: number;
}
