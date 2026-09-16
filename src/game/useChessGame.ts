import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Move, Piece, PieceSymbol, Square } from "chess.js";
import {
  attemptMove,
  createChess,
  deriveResult,
  getLegalTargets,
  getMoveOptions,
  loadPosition,
  resetPosition,
  sideOf,
  toMoveRecord,
} from "./chessGame";
import type { Difficulty, GameResult, GameState, PromotionRequest, Side } from "./types";
import { TIER_DEPTH } from "../engine/difficulty";
import { createStockfishClient, type StockfishClient } from "../engine/stockfishClient";
import { parseUci } from "../engine/uci";
import { parseStartupOptions } from "../test/startupOptions";

/** Visible thinking indicator minimum, comfortably above the 250 ms requirement. */
const THINKING_MIN_MS = 400;

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveStatusText(state: GameState): string {
  if (state.phase === "setup") {
    return "Select a difficulty and start a game.";
  }
  if (state.phase === "ended" && state.result) {
    if (state.result.kind === "checkmate") {
      return `Checkmate — ${state.result.winner === "white" ? "White (you)" : "Black (computer)"} wins.`;
    }
    return "Stalemate — draw.";
  }
  if (state.engineError) {
    return "The computer is unavailable right now.";
  }
  if (state.thinking) {
    return "Computer is thinking…";
  }
  const side = state.turn === "white" ? "White (you)" : "Black (computer)";
  if (state.check) {
    return `${state.turn === "white" ? "White" : "Black"} is in check. ${side} to move.`;
  }
  return `${side} to move.`;
}

function createInitialState(difficulty: Difficulty | null = null): GameState {
  const chess = new Chess();
  const state: GameState = {
    phase: "setup",
    difficulty,
    fen: chess.fen(),
    turn: "white",
    selectedSquare: null,
    legalTargets: [],
    thinking: false,
    check: false,
    statusText: "",
    result: null,
    moveHistory: [],
    promotion: null,
    message: null,
    engineError: false,
  };
  return { ...state, statusText: deriveStatusText(state) };
}

type Action =
  | { type: "selectDifficulty"; difficulty: Difficulty }
  | {
      type: "start";
      fen: string;
      turn: Side;
      check: boolean;
      result: GameResult | null;
    }
  | { type: "select"; square: Square; legalTargets: Square[] }
  | { type: "clearSelection" }
  | {
      type: "applyMove";
      move: Move;
      fen: string;
      turn: Side;
      check: boolean;
      result: GameResult | null;
    }
  | { type: "setPromotion"; promotion: PromotionRequest }
  | { type: "clearPromotion" }
  | { type: "message"; message: string }
  | { type: "clearMessage" }
  | { type: "thinking"; value: boolean }
  | { type: "engineError"; value: boolean }
  | { type: "restart" };

function coreReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "selectDifficulty":
      if (state.phase !== "setup") return state;
      return { ...state, difficulty: action.difficulty, message: null };
    case "start":
      return {
        ...state,
        phase: action.result ? "ended" : "playing",
        fen: action.fen,
        turn: action.turn,
        check: action.check,
        result: action.result,
        selectedSquare: null,
        legalTargets: [],
        moveHistory: [],
        promotion: null,
        message: null,
        engineError: false,
        thinking: false,
      };
    case "select":
      return {
        ...state,
        selectedSquare: action.square,
        legalTargets: action.legalTargets,
        message: null,
      };
    case "clearSelection":
      return { ...state, selectedSquare: null, legalTargets: [] };
    case "applyMove":
      return {
        ...state,
        fen: action.fen,
        turn: action.turn,
        check: action.check,
        result: action.result,
        phase: action.result ? "ended" : "playing",
        selectedSquare: null,
        legalTargets: [],
        promotion: null,
        message: null,
        moveHistory: [
          ...state.moveHistory,
          toMoveRecord(action.move, state.moveHistory.length + 1),
        ],
      };
    case "setPromotion":
      return { ...state, promotion: action.promotion, message: null };
    case "clearPromotion":
      return { ...state, promotion: null };
    case "message":
      return { ...state, message: action.message };
    case "clearMessage":
      return { ...state, message: null };
    case "thinking":
      return { ...state, thinking: action.value };
    case "engineError":
      return { ...state, engineError: action.value };
    case "restart":
      return createInitialState(null);
    default:
      return state;
  }
}

function reducer(state: GameState, action: Action): GameState {
  const next = coreReducer(state, action);
  return { ...next, statusText: deriveStatusText(next) };
}

export interface UseChessGame {
  state: GameState;
  board: (Piece | null)[][];
  engineDepth: number | null;
  selectDifficulty: (difficulty: Difficulty) => void;
  startGame: () => void;
  handleSquareClick: (square: Square) => void;
  choosePromotion: (piece: PieceSymbol) => void;
  restartGame: () => void;
}

export function useChessGame(): UseChessGame {
  const startup = parseStartupOptions();
  const [state, dispatch] = useReducer(reducer, startup.difficulty, createInitialState);

  const [chess] = useState<Chess>(() => createChess());
  const seedRef = useRef<string | null>(startup.fen);
  const clientRef = useRef<StockfishClient | null>(null);
  const generationRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const getClient = useCallback((): StockfishClient => {
    if (!clientRef.current) clientRef.current = createStockfishClient(ENGINE_URL);
    return clientRef.current;
  }, []);

  const runComputerTurn = useCallback(
    async (generation: number, difficulty: Difficulty): Promise<void> => {
      const client = getClient();
      const startedAt = performance.now();
      dispatch({ type: "thinking", value: true });

      const best = await client.findBestMove(chess.fen(), TIER_DEPTH[difficulty]);

      const elapsed = performance.now() - startedAt;
      if (elapsed < THINKING_MIN_MS) await delay(THINKING_MIN_MS - elapsed);

      if (generation !== generationRef.current) return;

      if (best === null) {
        dispatch({ type: "thinking", value: false });
        dispatch({ type: "engineError", value: true });
        return;
      }

      const parsed = parseUci(best);
      const attempt = parsed
        ? attemptMove(chess, parsed.from, parsed.to, parsed.promotion)
        : ({ ok: false, error: "Invalid engine move" } as const);

      if (!attempt.ok) {
        dispatch({ type: "thinking", value: false });
        dispatch({ type: "engineError", value: true });
        return;
      }

      dispatch({
        type: "applyMove",
        move: attempt.move,
        fen: chess.fen(),
        turn: sideOf(chess.turn()),
        check: chess.isCheck(),
        result: deriveResult(chess),
      });
      dispatch({ type: "thinking", value: false });
    },
    [chess, getClient],
  );

  const selectDifficulty = useCallback((difficulty: Difficulty) => {
    if (stateRef.current.phase !== "setup") return;
    dispatch({ type: "selectDifficulty", difficulty });
  }, []);

  const startGame = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== "setup") return;
    if (!current.difficulty) {
      dispatch({ type: "message", message: "Select a difficulty before starting." });
      return;
    }

    generationRef.current += 1;
    const generation = generationRef.current;
    const seed = seedRef.current;

    if (seed) {
      if (!loadPosition(chess, seed)) {
        dispatch({ type: "message", message: "The seeded position is invalid." });
        return;
      }
    } else {
      resetPosition(chess);
    }

    const result = deriveResult(chess);
    dispatch({
      type: "start",
      fen: chess.fen(),
      turn: sideOf(chess.turn()),
      check: chess.isCheck(),
      result,
    });

    if (!result && chess.turn() === "b") {
      void runComputerTurn(generation, current.difficulty);
    }
  }, [chess, runComputerTurn]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      const current = stateRef.current;
      if (current.phase !== "playing") return;
      if (current.thinking) return;
      if (current.turn !== "white") return;
      if (current.promotion) return;

      const selected = current.selectedSquare;

      if (!selected) {
        const piece = chess.get(square);
        if (piece && piece.color === "w") {
          dispatch({
            type: "select",
            square,
            legalTargets: getLegalTargets(chess, square),
          });
        }
        return;
      }

      if (square === selected) {
        dispatch({ type: "clearSelection" });
        return;
      }

      const piece = chess.get(square);
      if (piece && piece.color === "w") {
        dispatch({
          type: "select",
          square,
          legalTargets: getLegalTargets(chess, square),
        });
        return;
      }

      if (!current.legalTargets.includes(square)) {
        dispatch({ type: "message", message: "That move is not allowed." });
        return;
      }

      const options = getMoveOptions(chess, selected, square);
      if (options.some((move) => move.isPromotion())) {
        dispatch({
          type: "setPromotion",
          promotion: { from: selected, to: square, side: "white" },
        });
        return;
      }

      const attempt = attemptMove(chess, selected, square);
      if (!attempt.ok) {
        dispatch({ type: "message", message: "That move is not allowed." });
        return;
      }

      const result = deriveResult(chess);
      dispatch({
        type: "applyMove",
        move: attempt.move,
        fen: chess.fen(),
        turn: sideOf(chess.turn()),
        check: chess.isCheck(),
        result,
      });

      if (!result && chess.turn() === "b") {
        void runComputerTurn(generationRef.current, current.difficulty!);
      }
    },
    [chess, runComputerTurn],
  );

  const choosePromotion = useCallback(
    (piece: PieceSymbol) => {
      const current = stateRef.current;
      if (!current.promotion) return;
      const { from, to } = current.promotion;
      const attempt = attemptMove(chess, from, to, piece);

      if (!attempt.ok) {
        dispatch({ type: "clearPromotion" });
        dispatch({ type: "message", message: "That move is not allowed." });
        return;
      }

      const result = deriveResult(chess);
      dispatch({
        type: "applyMove",
        move: attempt.move,
        fen: chess.fen(),
        turn: sideOf(chess.turn()),
        check: chess.isCheck(),
        result,
      });

      if (!result && chess.turn() === "b") {
        void runComputerTurn(generationRef.current, current.difficulty!);
      }
    },
    [chess, runComputerTurn],
  );

  const restartGame = useCallback(() => {
    generationRef.current += 1;
    seedRef.current = null;
    resetPosition(chess);
    dispatch({ type: "restart" });
  }, [chess]);

  return {
    state,
    board: chess.board(),
    engineDepth: state.difficulty ? TIER_DEPTH[state.difficulty] : null,
    selectDifficulty,
    startGame,
    handleSquareClick,
    choosePromotion,
    restartGame,
  };
}
