/**
 * LLMEventBatcher - Batches LLM events for efficient WebSocket delivery
 *
 * Features:
 * - Per-team in-memory buffers
 * - 5-second flush interval (configurable)
 * - Buffer size cap with graceful degradation (drop oldest)
 * - Payload optimization (only essential fields)
 * - Periodic cleanup for idle teams
 */

const FLUSH_REASONS = {
  TIMER: 1,
  BUFFER_FULL: 2,
  MANUAL: 3,
} as const;

type FlushReason = typeof FLUSH_REASONS[keyof typeof FLUSH_REASONS];

interface TsdbEvent {
  timestamp?: Date | string;
  trace_id?: string;
  model?: string;
  provider?: string;
  agent?: string;
  cost_total?: number;
  latency_ms?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  usage_input_tokens?: number;
  usage_output_tokens?: number;
}

interface EventSummary {
  timestamp: string | undefined;
  trace_id: string | undefined;
  model: string;
  provider: string | null;
  agent: string | null;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  latency_ms: number | null;
}

interface TeamBuffer {
  teamId: string;
  events: EventSummary[];
  flushTimer: ReturnType<typeof setTimeout> | null;
  lastFlush: Date;
  droppedCount: number;
}

interface BatchPayload {
  type: string;
  teamId: string;
  events: EventSummary[];
  meta: {
    batchSize: number;
    droppedCount: number;
    windowStart: string | undefined;
    windowEnd: string | undefined;
    flushReason: FlushReason;
  };
}

interface Emitter {
  to: (room: string) => { emit: (event: string, payload: BatchPayload) => void };
}

interface BatcherOptions {
  flushIntervalMs?: number;
  maxBufferSize?: number;
  maxEventsPerFlush?: number;
}

class LLMEventBatcher {
  private flushIntervalMs: number;
  private maxBufferSize: number;
  private maxEventsPerFlush: number;
  private teamBuffers: Map<string, TeamBuffer>;
  private emitter: Emitter | null;
  private totalEventsBuffered: number;
  private totalBatchesSent: number;
  private totalEventsDropped: number;
  private _cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: BatcherOptions = {}) {
    // Configuration
    this.flushIntervalMs = options.flushIntervalMs || 5000; // 5 seconds
    this.maxBufferSize = options.maxBufferSize || 500; // Max events per team buffer
    this.maxEventsPerFlush = options.maxEventsPerFlush || 100; // Max events per batch

    // State
    this.teamBuffers = new Map(); // teamId -> TeamBuffer
    this.emitter = null; // Set by setEmitter()

    // Metrics
    this.totalEventsBuffered = 0;
    this.totalBatchesSent = 0;
    this.totalEventsDropped = 0;

    // Start periodic cleanup
    this._cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000); // Every 5 minutes
  }

  /**
   * Set the Socket.IO emitter for broadcasting
   * Called during control_sockets initialization
   * @param {Object} controlEmitter - Socket.IO namespace emitter
   */
  setEmitter(controlEmitter: Emitter): void {
    this.emitter = controlEmitter;
    console.log("[LLMEventBatcher] Emitter configured");
  }

  /**
   * Add events to the buffer for a team
   * Called from control_service.js after TSDB insert
   * @param {string|number} teamId - Team identifier
   * @param {Array} tsdbEvents - Array of TSDB events
   */
  add(teamId: string | number, tsdbEvents: TsdbEvent[]): void {
    if (!tsdbEvents || tsdbEvents.length === 0) return;

    const teamIdStr = String(teamId);

    // Transform to lightweight summaries
    const summaries = tsdbEvents.map((e) => this._transformToSummary(e));

    // Get or create buffer
    let buffer = this.teamBuffers.get(teamIdStr);
    if (!buffer) {
      buffer = this._createBuffer(teamIdStr);
      this.teamBuffers.set(teamIdStr, buffer);
    }

    // Add events with overflow handling
    this._addToBuffer(buffer, summaries);

    // Start/reset flush timer if not already running
    this._scheduleFlush(teamIdStr, buffer);
  }

  /**
   * Transform full TSDB event to lightweight summary
   * Only includes fields needed for dashboard display
   * @param {Object} event - Full TSDB event
   * @returns {Object} Lightweight event summary
   */
  private _transformToSummary(event: TsdbEvent): EventSummary {
    // Handle both nested usage object (from transformMetricToTsdbEvent)
    // and flat fields (from TSDB query results)
    const inputTokens = event.usage?.input_tokens ?? event.usage_input_tokens ?? 0;
    const outputTokens = event.usage?.output_tokens ?? event.usage_output_tokens ?? 0;

    return {
      timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
      trace_id: event.trace_id,
      model: event.model || "",
      provider: event.provider || null,
      agent: event.agent || null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost: event.cost_total || 0,
      latency_ms: event.latency_ms || null,
    };
  }

  /**
   * Add events to buffer with overflow handling
   * @param {Object} buffer - Team buffer
   * @param {Array} summaries - Event summaries to add
   */
  private _addToBuffer(buffer: TeamBuffer, summaries: EventSummary[]): void {
    for (const summary of summaries) {
      if (buffer.events.length >= this.maxBufferSize) {
        // Drop oldest event
        buffer.events.shift();
        buffer.droppedCount++;
        this.totalEventsDropped++;
      }
      buffer.events.push(summary);
      this.totalEventsBuffered++;
    }

    // Force flush if buffer is full
    if (buffer.events.length >= this.maxBufferSize) {
      this._flush(buffer.teamId, FLUSH_REASONS.BUFFER_FULL);
    }
  }

  /**
   * Schedule flush timer for a team
   * @param {string} teamId - Team identifier
   * @param {Object} buffer - Team buffer
   */
  private _scheduleFlush(teamId: string, buffer: TeamBuffer): void {
    // Don't reschedule if timer already running
    if (buffer.flushTimer) return;

    buffer.flushTimer = setTimeout(() => {
      this._flush(teamId, FLUSH_REASONS.TIMER);
    }, this.flushIntervalMs);
  }

  /**
   * Flush buffered events to WebSocket
   * @param {string} teamId - Team identifier
   * @param {number} flushReason - Reason for flush
   */
  private _flush(teamId: string, flushReason: FlushReason): void {
    const buffer = this.teamBuffers.get(teamId);
    if (!buffer || buffer.events.length === 0) return;

    // Clear timer
    if (buffer.flushTimer) {
      clearTimeout(buffer.flushTimer);
      buffer.flushTimer = null;
    }

    // Extract batch (up to maxEventsPerFlush)
    const batch = buffer.events.splice(0, this.maxEventsPerFlush);
    const droppedCount = buffer.droppedCount;
    buffer.droppedCount = 0;
    buffer.lastFlush = new Date();

    // Build payload
    const payload: BatchPayload = {
      type: "llm-events-batch",
      teamId: teamId,
      events: batch,
      meta: {
        batchSize: batch.length,
        droppedCount: droppedCount,
        windowStart: batch[0]?.timestamp,
        windowEnd: batch[batch.length - 1]?.timestamp,
        flushReason: flushReason,
      },
    };

    // Emit to team room
    if (this.emitter) {
      const room = `team:${teamId}:llm-events`;
      this.emitter.to(room).emit("message", payload);
      this.totalBatchesSent++;

      if (batch.length > 0) {
        console.log(
          `[LLMEventBatcher] Flushed ${batch.length} events to ${room} ` +
            `(dropped: ${droppedCount}, reason: ${flushReason})`
        );
      }
    }

    // Schedule next flush if buffer still has events
    if (buffer.events.length > 0) {
      this._scheduleFlush(teamId, buffer);
    }
  }

  /**
   * Create a new buffer for a team
   * @param {string} teamId - Team identifier
   * @returns {Object} New team buffer
   */
  private _createBuffer(teamId: string): TeamBuffer {
    return {
      teamId: teamId,
      events: [],
      flushTimer: null,
      lastFlush: new Date(),
      droppedCount: 0,
    };
  }

  /**
   * Manually flush all buffers (useful for shutdown)
   */
  flushAll(): void {
    for (const [teamId] of this.teamBuffers) {
      this._flush(teamId, FLUSH_REASONS.MANUAL);
    }
  }

  /**
   * Get metrics for monitoring
   * @returns {Object} Batcher metrics
   */
  getMetrics(): { activeTeams: number; totalBuffered: number; totalEventsBuffered: number; totalBatchesSent: number; totalEventsDropped: number } {
    const activeTeams = this.teamBuffers.size;
    const totalBuffered = Array.from(this.teamBuffers.values()).reduce(
      (sum, b) => sum + b.events.length,
      0
    );

    return {
      activeTeams,
      totalBuffered,
      totalEventsBuffered: this.totalEventsBuffered,
      totalBatchesSent: this.totalBatchesSent,
      totalEventsDropped: this.totalEventsDropped,
    };
  }

  /**
   * Cleanup buffers for teams with no recent activity
   * Prevents memory leaks from inactive teams
   * @param {number} maxIdleMs - Max idle time before cleanup (default: 5 minutes)
   */
  cleanup(maxIdleMs = 300000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [teamId, buffer] of this.teamBuffers.entries()) {
      if (buffer.events.length === 0 && now - buffer.lastFlush.getTime() > maxIdleMs) {
        if (buffer.flushTimer) {
          clearTimeout(buffer.flushTimer);
        }
        this.teamBuffers.delete(teamId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[LLMEventBatcher] Cleaned up ${cleaned} idle team buffers`);
    }
  }

  /**
   * Shutdown the batcher (cleanup intervals and flush remaining)
   */
  shutdown(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.flushAll();
    console.log("[LLMEventBatcher] Shutdown complete");
  }
}

// Singleton instance
const llmEventBatcher = new LLMEventBatcher();

export default llmEventBatcher;
