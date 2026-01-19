/* ============================
 * Fixtures Feed Interfaces
 * ============================
 */

export interface FixtureTeam {
  id: number; // Team ID
  name: string; // Team display name
  slug: string; // Fixture slug
  acronym?: string; // Short code (e.g., TSM)
  image_url?: string; // Team logo URL
  location?: string; // Country
}

export interface FixtureOpponent {
  type: string; // "Team" | "Player"
  playing_as?: string; // eBattles player name
  opponent: FixtureTeam; // Linked team entity
}

export interface BettingGroup {
  id?: number | null; // Blueprint ID
  name: string; // Blueprint name
}

export interface Blueprint {
  id?: number | null; // Blueprint ID
  name: string; // Blueprint name
}

export interface FixtureMatchBettingMetadata {
  betbuilder_enabled: boolean; // BetBuilder available toggle
  betting_group: BettingGroup | null; // Applied betting group
  blueprint: Blueprint | null; // Applied blueprint
  bookable: boolean; // Is match open for booking
  booked: boolean; // Has match been booked
  booked_at: string | null; // Booking timestamp ISO8601
  booked_by_user_id?: number | null; // Who booked it
  coverage: string; // Match coverage level
  inputs_enable: boolean;
  live_available: boolean; // Live odds toggle
  markets_created: boolean; // Markets have been created
  markets_updated_at: string | null; // Last markets update time
  micromarkets_enabled: boolean; // Micromarkets toggle
  pandascore_reviewed: boolean; // Match reviewed by PandaScore
  settled: boolean; // Match fully settled
}

export interface FixtureWinner {
  id?: number | null; // Winner team ID
  type?: string; // "Team" | "Player"
  acronym?: string; // Winner acronym
  image_url?: string; // Winner image/logo
  location?: string; // Winner location
  modified_at?: string; // Last update timestamp
  name?: string; // Winner name
  slug?: string; // Winner slug
}

export interface FixtureSerie {
  id: number; // Series ID
  begin_at: string | null; // Serie start time ISO8601
  description: string | null; // Serie description
  end_at: string | null; // End time ISO8601
  full_name: string; // Full series name
  league_id: number; // Parent league ID
  league_image_url?: string; // League logo URL
  league_name?: string; // League name
  modified_at: string; // Last modified timestamp
  name: string; // Short name
  season: string | null; // Season label (e.g., 2025 Spring)
  slug: string; // Series slug
  tier: string; // Tier label (e.g., S/A/B)
  videogame_title: {
    // Videogame info (inline type)
    id: number; // Game ID
    name: string; // Game name
    slug: string; // Game slug
  } | null;
  winner_id?: number | null; // Series winner ID
  winner_type: string | null; // "Team" | "Player"
  year?: number | null; // Calendar year
}

export interface FixtureMatch {
  id: number; // Match ID
  name: string; // Match name (e.g., T1 vs G2)
  scheduled_at: string; // Scheduled time ISO8601
  begin_at: string | null; // Actual start time ISO8601
  detailed_stats: boolean; // Detailed stats available
  betting_metadata: FixtureMatchBettingMetadata; // Betting metadata
  league_id: number; // League ID
  status: string; // Match status
  opponents: FixtureOpponent[]; // Participants
  winner: FixtureWinner | null; // Winner if decided
  serie?: FixtureSerie; // Series information
}

export interface FixtureMessage {
  type: 'fixture'; // Constant discriminator
  at: string; // Message timestamp ISO8601
  action: string; // Message action
  event_type: string; // Event type
  event_id: number; // Event ID
  videogame_slug: string; // Game slug (e.g., lol, csgo)
  tournament_tier: string; // Tier
  match_id?: number | null; // Match ID for action
  game_position?: number | null; // Map/game index if applicable
  match?: FixtureMatch; // Attached match payload
  serie?: FixtureSerie; // Attached series payload
}

/* ============================
 * Markets Feed Interfaces
 * ============================
 */

export interface MarketsMessageSelection {
  id: string; // Selection ID (unique within market)
  position: number; // Selection order within market
  name: string; // Selection name (e.g., Over 2.5)
  template: string; // Template key
  line?: string | null; // Line as string (e.g., "2.5")
  participant_type?: string | null; // "Team" | "Player"
  participant_id?: number | null; // Linked participant ID
  opponent_type?: string; // "Team" | "Player"
  probability: number; // Implied probability
  probability_with_overround: number; // With overround applied
  odds_decimal?: number | null; // Decimal odds
  odds_decimal_with_overround?: number | null; // Odds incl. overround
  odds_decimal_with_margin?: number | null; // Odds incl. margin
  probability_with_margin?: number | null; // Probability incl. margin
  handicap?: number | null; // Handicap value (if applicable)
  participant_side?: string; // "home" | "away"
  score_away?: number | null; // Score context (away)
  score_home?: number | null; // Score context (home)
  number?: number | null; // Numeric param
  opponent_id?: number | null; // Opponent entity ID
  range_max?: number | null; // Range upper bound
  range_min?: number | null; // Range lower bound
  result: string; // Selection result
}

export interface MarketsMessageMarket {
  id: string; // Market ID
  line?: string | null; // Market line (e.g., "2.5")
  name: string; // Market name
  status: string; // "active" | "suspended" | "deactivated" | etc.
  template: string; // Market template key
  participant_id?: number | null; // Participant ID
  participant_type?: string | null; // "Team" | "Player"
  overround: number; // Overround value (e.g., 110)
  margin?: number | null; // Margin value
  reviewed?: boolean | null; // Reviewed by PandaScore
  auto_deactivated_at?: string; // Micromarket timestamp
  drake_index?: number; // Drake objective index
  nashor_index?: number; // Nashor objective index
  tower_index?: number; // Tower objective index
  rift_herald_index?: number; // Rift Herald objective index
  champion_id?: number; // Champion ID (LoL)
  timer?: number; // Timer
  time_window_starts_at?: number; // Start of time window (sec)
  time_window_ends_at?: number; // End of time window (sec)
  handicap_away?: number | null; // Away handicap
  handicap_home?: number | null; // Home handicap
  dynamic_line_grouping_key?: string; // Grouping key for live line clusters
  participant_side?: string; // "home"/"away"
  player_away_id?: number | null; // Away player ID (player props)
  player_home_id?: number | null; // Home player ID (player props)
  team_id?: number | null; // Team context ID
  player_id?: number | null; // Player context ID
  player_kills?: number | null; // Player kill threshold
  prebuilt_parent_selection_ids?: string[]; // Parent selections for prebuilt market
  story?: string; // Story builder market
  quarter_index?: number; // Quarter number (ebasketball)
  half_index?: number; // Half number (esoccer)
  goal_index?: number; // Goal sequence index (esoccer)
  selections: MarketsMessageSelection[]; // Selections for this market
}

export interface MarketsMessage {
  type: 'markets'; // Constant discriminator
  at: string; // Message timestamp ISO8601
  action: string; // Message action
  event_type: string; // Event type
  event_id: number; // Event ID
  videogame_slug: string; // Game slug
  match_id?: number | null; // Related match ID
  tournament_tier: string; // Tier
  game_position?: number | null; // Map/game index
  markets: MarketsMessageMarket[]; // Markets payload
}

/* ============================
 * Scoreboard Feed Interfaces
 * ============================
 */

/* --- eSoccer --- */

export interface EsoccerPlayer {
  id: number; // PandaScore player ID
  goal_score: number; // Total goals for the player (game aggregate)
}

export interface EsoccerHalf {
  index: number; // Half index within the game (1 or 2)
  players: EsoccerPlayer[]; // Per-half goals per player
}

export interface EsoccerTimerObject {
  timer: number; // Match timer in seconds (0–300 = 1st half, 300–600 = 2nd half)
  paused: boolean; // Whether the timer is currently paused
  issued_at: string; // ISO8601 timestamp when this snapshot was emitted
}

export interface EsoccerGame {
  id: number; // PandaScore e-Soccer game ID
  position: number; // Game position in the match
  status: string; // Game status (e.g., "running", "finished")

  /**
   * Match timer object counting UP:
   * 0–300 = 1st half, 300–600 = 2nd half.
   * Matches JSON: { timer, paused, issued_at }
   */
  timer?: EsoccerTimerObject | null;

  current_half?: number | null; // 1 = first half, 2 = second half

  players: EsoccerPlayer[]; // Game-level player goals (aggregate)
  halves: EsoccerHalf[]; // Half-by-half breakdown
}

export interface ScoreboardEsoccer {
  id: number; // PandaScore match ID
  updated_at: string; // ISO8601 UTC, e.g., "2025-08-29T09:48:58.453Z"
  games: EsoccerGame[]; // Games within the match
}

/* --- eBasketball --- */

export interface EbasketballPlayer {
  id: number; // PandaScore player ID
  point_score: number; // Total points for the player (game aggregate)
}

export interface EbasketballQuarter {
  index: number; // Quarter index (1..4 for regulation; >4 for OT in other contexts)
  players: EbasketballPlayer[]; // Per-quarter points per player
}

export interface EbasketballTimerObject {
  timer: number; // Quarter timer in seconds (counts DOWN 300 → 0 each quarter)
  paused: boolean; // Whether the timer is currently paused
  issued_at: string; // ISO8601 timestamp when this snapshot was emitted
}

export interface EbasketballGame {
  id: number; // PandaScore e-Basketball game ID
  position: number; // Game position in the match
  status: string; // Game status (e.g., "running", "finished")

  /**
   * Match timer object; counts DOWN:
   * 300 → 0 each quarter, resets to 300 at the start of the next quarter.
   * Matches JSON: { timer, paused, issued_at }
   */
  timer?: EbasketballTimerObject | null;

  /**
   * 1–4 represent regulation quarters; values >4 represent overtime periods (OT1, OT2, …).
   */
  current_quarter?: number | null;

  players: EbasketballPlayer[]; // Game-level player points (aggregate)
  quarters: EbasketballQuarter[]; // Quarter-by-quarter breakdown
}

export interface ScoreboardEbasketball {
  id: number; // PandaScore match ID
  updated_at: string; // ISO8601 UTC, e.g., "2025-08-29T09:48:16.163Z"
  games: EbasketballGame[]; // Games within the match
}

/* --- CS:GO/CS2 --- */

export interface CsMap {
  id: number; // Map ID
  name: string; // Map name (e.g., Mirage)
}

export interface CsTeam {
  id: number; // Team ID
  side: string | null; // "ct" | "t" | null
  round_score: number; // Rounds won
}

export interface CsGame {
  id: number; // Game/map ID
  position: number; // Map number in series
  status: string; // Game status
  map: CsMap; // Map info
  teams: CsTeam[]; // Two teams snapshot
}

export interface ScoreboardCs {
  id: number; // Match ID
  updated_at: string; // ISO8601 timestamp
  games: CsGame[]; // Maps/games
}

/* --- DOTA 2 --- */

export interface Hero {
  id: number; // Hero ID
  name: string; // Hero name
}

export interface Dota2Team {
  id: number; // Team ID
  side: string | null; // "radiant" | "dire" | null
  heroes_picked?: Hero[]; // Picked heroes
  kills?: number | null; // Kills total
  towers_destroyed?: number | null; // Towers taken
}

export interface Dota2Game {
  id: number; // Game ID
  position: number; // Game number in series
  status: string; // Game status
  timer?: number | null; // Seconds elapsed (guess)
  radiant_gold_lead?: number | null; // Net worth lead for Radiant (guess)
  teams: Dota2Team[]; // Two teams snapshot
}

export interface ScoreboardDota2 {
  id: number; // Match ID
  updated_at: string; // ISO8601 timestamp
  games: Dota2Game[]; // Games in match
}

/* --- LEAGUE OF LEGENDS --- */

export interface LolTimerObject {
  timer: number; // Seconds elapsed
  paused: boolean; // Is timer paused
  issued_at: string; // When this timer snapshot was emitted
}

export type lol_timer = number | LolTimerObject | null; // Either raw seconds, object, or null

export interface LolTeam {
  id: number; // Team ID
  side: string | null;
  kills?: number | null; // Kills
  drakes?: number | null; // Dragons taken
  inhibitors?: number | null; // Inhibitors destroyed
  nashors?: number | null; // Barons taken
  towers?: number | null; // Towers destroyed
}

export interface LolGame {
  id: number; // Game ID
  position: number; // Game number in series
  status: string; // Game status
  timer?: lol_timer; // Timer (number or object)
  teams: LolTeam[]; // Two teams snapshot
  draft?: {
    // Draft phase picks (if present)
    picks: any[]; // Array of picks/bans (structure TBD)
  };
}

export interface ScoreboardLol {
  id: number; // Match ID
  updated_at: string | null; // ISO8601 timestamp or null if unknown
  games: LolGame[]; // Games in match
}

/* --- VALORANT --- */

export interface ValorantMap {
  slug: string; // Map slug (e.g., ascent)
  name: string; // Map name (e.g., Ascent)
}

export interface ValorantTeam {
  id: number; // Team ID
  round_score: number; // Rounds won
  side: 'attacker' | 'defender' | null; // Current side
}

export interface ValorantGame {
  id: number; // Game ID
  position: number; // Map number in series
  status: string; // Game status
  map: ValorantMap | null; // Map info or null if TBD
  teams: ValorantTeam[]; // Two teams snapshot
}

export interface ScoreboardValorant {
  id: number; // Match ID
  updated_at: string; // ISO8601 timestamp
  games: ValorantGame[]; // Maps/games
}

export type scoreboard =
  | ScoreboardEsoccer
  | ScoreboardEbasketball
  | ScoreboardCs
  | ScoreboardDota2
  | ScoreboardLol
  | ScoreboardValorant;
