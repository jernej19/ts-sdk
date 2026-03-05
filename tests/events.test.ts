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

  it('should trigger disconnection after 30s with no heartbeat (3 missed intervals)', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // No heartbeats for 29s — should NOT trigger yet
    vi.advanceTimersByTime(29000);
    expect(notifications).toHaveLength(0);

    // At 30s — should trigger
    vi.advanceTimersByTime(1000);
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

    // Heartbeat arrives at 9s — resets timer
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 18s (9s after previous)
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 27s
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Another heartbeat at 36s
    vi.advanceTimersByTime(9000);
    handler.handleHeartbeat();

    // Continue for a long time with 10s heartbeats
    for (let i = 0; i < 100; i++) {
      vi.advanceTimersByTime(10000);
      handler.handleHeartbeat();
    }

    // No disconnection should have fired
    expect(notifications).toHaveLength(0);
  });

  it('should reset the 30s window when a heartbeat arrives after a gap', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // Miss 2 heartbeats (20s gap)
    vi.advanceTimersByTime(20000);

    // Heartbeat arrives — should reset the 30s window
    handler.handleHeartbeat();

    // Another 20s gap — still within the new 30s window
    vi.advanceTimersByTime(20000);

    expect(notifications).toHaveLength(0);

    // 10 more seconds — now 30s since last heartbeat, should trigger
    vi.advanceTimersByTime(10000);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('disconnection');
  });

  it('should trigger disconnection only once even after extended silence', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // No heartbeats for 120 seconds
    vi.advanceTimersByTime(120000);

    // Should only have 1 disconnection notification
    const disconnections = notifications.filter((n) => n.type === 'disconnection');
    expect(disconnections).toHaveLength(1);
  });

  it('should not trigger disconnection if heartbeats arrive every 10s with jitter', () => {
    const handler = new EventHandler();
    const notifications: any[] = [];
    handler.on('notification', (n) => notifications.push(n));

    handler.startDisconnectionTimer();

    // Simulate heartbeats with varying jitter (8-12s intervals)
    const intervals = [8000, 12000, 9000, 11000, 10000, 8500, 11500, 9500, 10500];
    for (const interval of intervals) {
      vi.advanceTimersByTime(interval);
      handler.handleHeartbeat();
    }

    expect(notifications).toHaveLength(0);
  });
});
