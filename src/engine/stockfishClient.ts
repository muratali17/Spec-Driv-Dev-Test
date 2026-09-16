import { parseBestMove } from "./uci";

const INIT_TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 10_000;

export interface StockfishClient {
  /** Handshake (`uci`/`isready`); idempotent. Never rejects. */
  init(): Promise<void>;
  /** Search a fresh position at a fixed depth; resolves the UCI move or null. */
  findBestMove(fen: string, depth: number): Promise<string | null>;
  /** Stop any active search and terminate the worker. */
  dispose(): void;
}

type LineListener = (line: string) => void;

/**
 * Typed UCI client over the Stockfish Web Worker. Never mutates game state; it
 * only returns a UCI move string (contracts/engine-worker.md).
 */
export function createStockfishClient(workerUrl: string): StockfishClient {
  let worker: Worker | null = null;
  let failed = false;
  let initPromise: Promise<void> | null = null;
  const listeners = new Set<LineListener>();
  const failureCallbacks = new Set<() => void>();

  function emit(line: string): void {
    for (const listener of [...listeners]) listener(line);
  }

  function markFailed(): void {
    if (failed) return;
    failed = true;
    for (const callback of [...failureCallbacks]) callback();
  }

  /**
   * The engine posts one complete line per message (sometimes batching several
   * lines in one message). Each message is split on `\n`; a line is emitted even
   * when the message has no trailing newline.
   */
  function handleMessage(data: unknown): void {
    for (const raw of String(data).split("\n")) {
      const line = raw.trim();
      if (line) emit(line);
    }
  }

  function ensureWorker(): Worker | null {
    if (worker || failed) return worker;
    try {
      worker = new Worker(workerUrl);
    } catch {
      markFailed();
      return null;
    }
    worker.onmessage = (event: MessageEvent) => handleMessage(event.data);
    worker.onerror = () => {
      markFailed();
    };
    return worker;
  }

  function waitForLine(
    matches: (line: string) => boolean,
    timeoutMs: number,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      let settled = false;
      const listener: LineListener = (line) => {
        if (matches(line)) finish(line);
      };
      const onFailure = () => finish(null);
      const timer = setTimeout(() => finish(null), timeoutMs);
      function finish(value: string | null): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        listeners.delete(listener);
        failureCallbacks.delete(onFailure);
        resolve(value);
      }
      listeners.add(listener);
      failureCallbacks.add(onFailure);
      if (failed) finish(null);
    });
  }

  function init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const active = ensureWorker();
      if (!active || failed) return;
      const uciok = waitForLine((line) => /^uciok\b/.test(line), INIT_TIMEOUT_MS);
      active.postMessage("uci");
      if (!(await uciok)) {
        markFailed();
        return;
      }
      const readyok = waitForLine((line) => /^readyok\b/.test(line), INIT_TIMEOUT_MS);
      active.postMessage("isready");
      if (!(await readyok)) markFailed();
    })();
    return initPromise;
  }

  async function findBestMove(fen: string, depth: number): Promise<string | null> {
    if (failed) return null;
    await init();
    const active = worker;
    if (!active || failed) return null;

    return new Promise((resolve) => {
      let settled = false;
      const listener: LineListener = (line) => {
        if (/^bestmove\b/.test(line)) finish(parseBestMove(line));
      };
      const timer = setTimeout(() => finish(null), SEARCH_TIMEOUT_MS);
      function finish(value: string | null): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        listeners.delete(listener);
        resolve(value);
      }
      listeners.add(listener);
      active.postMessage("ucinewgame");
      active.postMessage("setoption name Clear Hash value true");
      active.postMessage(`position fen ${fen}`);
      active.postMessage(`go depth ${depth}`);
    });
  }

  function dispose(): void {
    if (!worker) return;
    try {
      worker.postMessage("quit");
    } catch {
      // Worker already terminated or unreachable; ignore.
    }
    worker.terminate();
    worker = null;
  }

  return { init, findBestMove, dispose };
}
