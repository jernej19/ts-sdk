import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as amqp from 'amqplib';
import { SDKConfig } from '@/config';
import { RMQFeed } from '@/rabbitmq_connection';

// Shared logger spies accessible to all tests
const loggerSpies = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock amqplib
vi.mock('amqplib', () => ({
  connect: vi.fn(),
}));

// Mock logger — returns shared spies so tests can assert on log calls
vi.mock('@/utils/logger', () => ({
  setupLogger: () => loggerSpies,
}));

// Mock events — must be a constructable class
vi.mock('@/events', () => {
  const MockEventHandler = vi.fn(function (this: any) {
    this.startDisconnectionTimer = vi.fn();
    this.handleReconnection = vi.fn();
    this.handleHeartbeat = vi.fn();
  });
  return { default: MockEventHandler };
});

// Mock unused imports that RMQFeed pulls in
vi.mock('@/markets/limitManager', () => ({
  calculateLimitsForMessage: vi.fn((msg: any) => msg),
}));
vi.mock('@/utils/oddsUtils', () => ({
  enrichSelectionsWithOdds: vi.fn((markets: any) => markets),
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

function createMockConnection() {
  return {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(createMockChannel()),
  };
}

function createMockChannel() {
  return {
    assertQueue: vi.fn().mockResolvedValue(undefined),
    assertExchange: vi.fn().mockResolvedValue(undefined),
    bindQueue: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn(),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    ack: vi.fn(),
    reject: vi.fn(),
  };
}

describe('RMQFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    RMQFeed._resetForTest();
    SDKConfig.getInstance().setConfig(mockConfig);
    vi.mocked(amqp.connect).mockReset();
    loggerSpies.info.mockClear();
    loggerSpies.warn.mockClear();
    loggerSpies.error.mockClear();
    loggerSpies.debug.mockClear();
  });

  afterEach(() => {
    RMQFeed._resetForTest();
    vi.useRealTimers();
  });

  describe('initializeRabbitMQ', () => {
    it('should connect successfully', async () => {
      const mockConn = createMockConnection();
      vi.mocked(amqp.connect).mockResolvedValue(mockConn as any);

      await RMQFeed.initializeRabbitMQ();

      expect(amqp.connect).toHaveBeenCalledTimes(1);
      const state = RMQFeed._getState();
      expect(state.connection).toBe(mockConn);
      expect(state.channel).not.toBeNull();
    });

    it('should skip initialization if connection already exists', async () => {
      const mockConn = createMockConnection();
      vi.mocked(amqp.connect).mockResolvedValue(mockConn as any);

      await RMQFeed.initializeRabbitMQ();
      await RMQFeed.initializeRabbitMQ(); // second call

      expect(amqp.connect).toHaveBeenCalledTimes(1);
      expect(loggerSpies.info).toHaveBeenCalledWith(
        'RabbitMQ connection already exists, skipping initialization.',
      );
    });

    it('should throw if config is not set', async () => {
      RMQFeed._resetForTest();
      const spy = vi.spyOn(SDKConfig.getInstance(), 'getConfig').mockReturnValue(null);

      await expect(RMQFeed.initializeRabbitMQ()).rejects.toThrow('SDK configuration is not set.');

      spy.mockRestore();
    });

    it('should retry connection on failure', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      await RMQFeed.initializeRabbitMQ();

      const state = RMQFeed._getState();
      expect(state.isReconnecting).toBe(true);
      expect(state.consecutiveFailures).toBe(1);
      expect(state.reconnectTimer).not.toBeNull();
    });
  });

  describe('retryConnection — isReconnecting guard', () => {
    it('should prevent concurrent reconnection attempts', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      await RMQFeed.initializeRabbitMQ();

      const state = RMQFeed._getState();
      expect(state.isReconnecting).toBe(true);
      expect(state.consecutiveFailures).toBe(1);

      const connectCallsBefore = vi.mocked(amqp.connect).mock.calls.length;

      // Advance past the 5-second retry timer
      await vi.advanceTimersByTimeAsync(5000);

      // Should have attempted exactly one more connection
      expect(vi.mocked(amqp.connect).mock.calls.length).toBe(connectCallsBefore + 1);
    });

    it('should not stack multiple retry timers from simultaneous error events', async () => {
      const mockConn = createMockConnection();
      vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

      await RMQFeed.initializeRabbitMQ();

      // Now simulate connection failure for reconnects
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      // Get the error handler registered on the connection
      const errorHandler = mockConn.on.mock.calls.find((c: any) => c[0] === 'error');
      expect(errorHandler).toBeDefined();

      // Trigger the error handler — this calls retryConnection
      errorHandler![1](new Error('socket hang up'));

      const state = RMQFeed._getState();
      expect(state.isReconnecting).toBe(true);

      // Advance timer — should only trigger one reconnect attempt
      await vi.advanceTimersByTimeAsync(5000);
      // 1 initial successful + 1 reconnect attempt = 2 total
      expect(vi.mocked(amqp.connect).mock.calls.length).toBe(2);
    });
  });

  describe('connectRabbitMQ — connection cleanup', () => {
    it('should close old connection before creating a new one', async () => {
      const mockConn1 = createMockConnection();
      const mockConn2 = createMockConnection();

      vi.mocked(amqp.connect)
        .mockResolvedValueOnce(mockConn1 as any)
        .mockResolvedValueOnce(mockConn2 as any);

      // First connection
      await RMQFeed.initializeRabbitMQ();
      expect(RMQFeed._getState().connection).toBe(mockConn1);

      // Simulate error to trigger reconnect
      const errorHandler = mockConn1.on.mock.calls.find((c: any) => c[0] === 'error');
      errorHandler![1](new Error('connection lost'));

      // Advance timer to trigger connectRabbitMQ
      await vi.advanceTimersByTimeAsync(5000);

      // Old connection should have been closed
      expect(mockConn1.close).toHaveBeenCalled();

      // New connection should be active
      expect(RMQFeed._getState().connection).toBe(mockConn2);
    });

    it('should handle cleanup errors gracefully when old connection is already dead', async () => {
      const mockConn1 = createMockConnection();
      mockConn1.close.mockRejectedValue(new Error('Connection already closed'));

      const mockConn2 = createMockConnection();

      vi.mocked(amqp.connect)
        .mockResolvedValueOnce(mockConn1 as any)
        .mockResolvedValueOnce(mockConn2 as any);

      await RMQFeed.initializeRabbitMQ();

      const errorHandler = mockConn1.on.mock.calls.find((c: any) => c[0] === 'error');
      errorHandler![1](new Error('connection lost'));

      await vi.advanceTimersByTimeAsync(5000);

      // Should still connect successfully despite cleanup error
      expect(RMQFeed._getState().connection).toBe(mockConn2);
    });
  });

  describe('consecutive failure tracking and warning', () => {
    it('should increment consecutiveFailures on each failed connection', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      await RMQFeed.initializeRabbitMQ();
      expect(RMQFeed._getState().consecutiveFailures).toBe(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(RMQFeed._getState().consecutiveFailures).toBe(2);

      await vi.advanceTimersByTimeAsync(5000);
      expect(RMQFeed._getState().consecutiveFailures).toBe(3);
    });

    it('should reset consecutiveFailures on successful connection', async () => {
      vi.mocked(amqp.connect)
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce(createMockConnection() as any);

      await RMQFeed.initializeRabbitMQ();
      expect(RMQFeed._getState().consecutiveFailures).toBe(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(RMQFeed._getState().consecutiveFailures).toBe(2);

      // Third attempt succeeds
      await vi.advanceTimersByTimeAsync(5000);
      expect(RMQFeed._getState().consecutiveFailures).toBe(0);
    });

    it('should log a warning after 5 consecutive failures (connection limit hint)', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      await RMQFeed.initializeRabbitMQ();
      // failures: 1 (initializeRabbitMQ)

      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(5000);
      }
      // failures: 1 (init) + 4 (retries) = 5

      expect(RMQFeed._getState().consecutiveFailures).toBe(5);

      // The warning about connection limit should have been logged
      const warnCalls = loggerSpies.warn.mock.calls.map((c: any) => c[0]);
      const limitWarning = warnCalls.find(
        (msg: string) => typeof msg === 'string' && msg.includes('connection limit'),
      );
      expect(limitWarning).toBeDefined();
    });

    it('should continue warning on every failure after threshold', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

      await RMQFeed.initializeRabbitMQ();

      // Get to 6 failures (1 init + 5 retries)
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(5000);
      }

      expect(RMQFeed._getState().consecutiveFailures).toBe(6);

      const warnCalls = loggerSpies.warn.mock.calls.map((c: any) => c[0]);
      const limitWarnings = warnCalls.filter(
        (msg: string) => typeof msg === 'string' && msg.includes('connection limit'),
      );
      // Should have warnings for failure 5 and failure 6
      expect(limitWarnings.length).toBe(2);
    });
  });

  describe('_resetForTest', () => {
    it('should reset all internal state', async () => {
      vi.mocked(amqp.connect).mockRejectedValue(new Error('fail'));

      await RMQFeed.initializeRabbitMQ();

      RMQFeed._resetForTest();
      const state = RMQFeed._getState();

      expect(state.connection).toBeNull();
      expect(state.channel).toBeNull();
      expect(state.isReconnecting).toBe(false);
      expect(state.consecutiveFailures).toBe(0);
      expect(state.reconnectTimer).toBeNull();
    });
  });
});
