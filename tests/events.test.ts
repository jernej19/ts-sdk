import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SDKConfig } from '@/config';
import EventHandler from '@/events';

// Mock logger
vi.mock('@/utils/logger', () => ({
  setupLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock Matches (used in handleReconnection)
vi.mock('@/matches', () => ({
  Matches: {
    recoverMarkets: vi.fn().mockResolvedValue(null),
    fetchMatchesRange: vi.fn().mockResolvedValue(null),
  },
}));

const mockConfig = {
  apiToken: 'test-token',
  company_id: 1,
  email: 'test@test.com',
  password: 'password',
  queues: [{ queueName: 'test-queue', routingKey: '#' }],
  apiBaseURL: 'https://api.test.com',
  feedHost: 'feed.test.com',
};

describe('EventHandler — disconnection detection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SDKConfig.getInstance().setConfig(mockConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should NOT trigger disconnection when heartbeats arrive on time', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // Simulate heartbeats arriving every 10s for 60 seconds
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(9500); // just before the 10s deadline
      handler.handleHeartbeat();
    }

    expect(notifications).toHaveLength(0);
  });

  it('should trigger disconnection after 3 missed heartbeats (30s with no heartbeat)', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // No heartbeats for 30 seconds
    vi.advanceTimersByTime(30000);

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('disconnection');
    expect(notifications[0].code).toBe(100);
  });

  it('should NOT have timer race conditions when heartbeats reset the timer', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    // Start timer (simulates initializeRabbitMQ calling startDisconnectionTimer)
    handler.startDisconnectionTimer();

    // Heartbeat arrives at 9s — resets timer, starts new one
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 18s (9s after previous)
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 27s
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 36s — if there was a race, disconnection
    // would have triggered by now due to stale timers incrementing missedHeartbeats
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // No disconnection should have fired
    expect(notifications).toHaveLength(0);
  });

  it('should reset missed heartbeat count when a heartbeat arrives', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // Miss 2 heartbeats (20s)
    vi.advanceTimersByTime(20000);

    // Heartbeat arrives — should reset counter
    handler.handleHeartbeat();

    // Miss 2 more (20s) — should NOT trigger disconnection since counter was reset
    vi.advanceTimersByTime(20000);

    expect(notifications).toHaveLength(0);
  });

  it('should trigger disconnection only once even if timer keeps running', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // No heartbeats for 60 seconds (6 missed beats)
    vi.advanceTimersByTime(60000);

    // Should only have 1 disconnection notification (not multiple)
    const disconnections = notifications.filter((n) => n.type === 'disconnection');
    expect(disconnections).toHaveLength(1);
  });
});
