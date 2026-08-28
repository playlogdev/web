import { parseGame, type Game } from "@/lib/games";

export const STEAM_LIBRARY_PAGE_SIZE = 24;
export const STEAM_CONNECT_TIMEOUT_MS = 3 * 60 * 1000;
export const STEAM_POLL_INTERVAL_MS = 2_000;
export const STEAM_SYNC_MAX_POLL_ATTEMPTS = 180;

export type SteamConnection =
  | { connected: false; game_count: 0 }
  | {
      connected: true;
      steam_id: string;
      connected_at: string;
      last_synced_at?: string;
      game_count: number;
    };

export const STEAM_SYNC_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export type SteamSyncStatus = (typeof STEAM_SYNC_STATUSES)[number];

export type SteamSyncJob = {
  id: string;
  status: SteamSyncStatus;
  total_count: number;
  matched_count: number;
  unmatched_count: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SteamLibraryItem = {
  steam_app_id: string;
  steam_name: string;
  playtime_minutes: number;
  matched: boolean;
  game: Game | null;
  last_seen_at: string;
};

export type SteamLibraryPage = {
  games: SteamLibraryItem[];
  total: number;
  limit: number;
  offset: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEAM_ID_PATTERN = /^[0-9]{15,20}$/;
const STEAM_APP_ID_PATTERN = /^[1-9][0-9]*$/;
const SYNC_STATUS_SET = new Set<string>(STEAM_SYNC_STATUSES);

export function isSteamSyncJobId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isSteamLibraryOffset(value: unknown): value is string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return false;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0;
}

export function parseSteamConnection(value: unknown): SteamConnection | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.connected !== "boolean" || !isCount(record.game_count)) {
    return null;
  }

  if (!record.connected) {
    if (
      record.game_count !== 0 ||
      record.steam_id !== undefined ||
      record.connected_at !== undefined ||
      record.last_synced_at !== undefined
    ) {
      return null;
    }
    return { connected: false, game_count: 0 };
  }

  if (
    typeof record.steam_id !== "string" ||
    !STEAM_ID_PATTERN.test(record.steam_id) ||
    !isTimestamp(record.connected_at) ||
    (record.last_synced_at !== undefined && !isTimestamp(record.last_synced_at))
  ) {
    return null;
  }

  const connection: SteamConnection = {
    connected: true,
    steam_id: record.steam_id,
    connected_at: record.connected_at,
    game_count: record.game_count,
  };
  if (typeof record.last_synced_at === "string") {
    connection.last_synced_at = record.last_synced_at;
  }
  return connection;
}

export function parseSteamSyncJob(value: unknown): SteamSyncJob | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    !isSteamSyncJobId(record.id) ||
    typeof record.status !== "string" ||
    !SYNC_STATUS_SET.has(record.status) ||
    !isCount(record.total_count) ||
    !isCount(record.matched_count) ||
    !isCount(record.unmatched_count) ||
    !isNullableString(record.error) ||
    !isNullableTimestamp(record.started_at) ||
    !isNullableTimestamp(record.completed_at) ||
    !isTimestamp(record.created_at)
  ) {
    return null;
  }

  const status = record.status as SteamSyncStatus;
  if (
    record.matched_count + record.unmatched_count > record.total_count ||
    (status === "completed" &&
      record.matched_count + record.unmatched_count !== record.total_count) ||
    (status === "failed" &&
      (typeof record.error !== "string" || record.error.trim().length === 0)) ||
    (status !== "failed" && record.error !== null) ||
    ((status === "running" || status === "completed" || status === "failed") &&
      record.started_at === null) ||
    ((status === "completed" || status === "failed") &&
      record.completed_at === null)
  ) {
    return null;
  }

  return {
    id: record.id,
    status,
    total_count: record.total_count,
    matched_count: record.matched_count,
    unmatched_count: record.unmatched_count,
    error: record.error,
    started_at: record.started_at,
    completed_at: record.completed_at,
    created_at: record.created_at,
  };
}

export function parseSteamLibraryPage(value: unknown): SteamLibraryPage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    !Array.isArray(record.games) ||
    !isCount(record.total) ||
    !isPageLimit(record.limit) ||
    !isCount(record.offset) ||
    record.games.length > record.limit
  ) {
    return null;
  }

  const games: SteamLibraryItem[] = [];
  for (const value of record.games) {
    const item = parseSteamLibraryItem(value);
    if (item === null) {
      return null;
    }
    games.push(item);
  }

  return {
    games,
    total: record.total,
    limit: record.limit,
    offset: record.offset,
  };
}

export function parseSteamAuthorizationURL(
  value: unknown,
  apiBaseURL: string,
): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 8_192) {
    return null;
  }

  try {
    const authorization = new URL(value);
    const apiBase = new URL(apiBaseURL);
    if (
      authorization.protocol !== "https:" ||
      authorization.hostname !== "steamcommunity.com" ||
      authorization.port !== "" ||
      authorization.username !== "" ||
      authorization.password !== "" ||
      authorization.pathname !== "/openid/login" ||
      authorization.hash !== "" ||
      authorization.searchParams.get("openid.ns") !==
        "http://specs.openid.net/auth/2.0" ||
      authorization.searchParams.get("openid.mode") !== "checkid_setup" ||
      authorization.searchParams.get("openid.identity") !==
        "http://specs.openid.net/auth/2.0/identifier_select" ||
      authorization.searchParams.get("openid.claimed_id") !==
        "http://specs.openid.net/auth/2.0/identifier_select"
    ) {
      return null;
    }

    const returnToRaw = authorization.searchParams.get("openid.return_to");
    const realm = authorization.searchParams.get("openid.realm");
    if (!returnToRaw || realm !== apiBase.origin) {
      return null;
    }
    const returnTo = new URL(returnToRaw);
    const expectedPath = `${apiBase.pathname.replace(/\/+$/, "")}/connections/steam/callback`;
    if (
      returnTo.origin !== apiBase.origin ||
      returnTo.pathname !== expectedPath ||
      !returnTo.searchParams.get("state") ||
      returnTo.hash !== ""
    ) {
      return null;
    }

    return authorization.toString();
  } catch {
    return null;
  }
}

function parseSteamLibraryItem(value: unknown): SteamLibraryItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.steam_app_id !== "string" ||
    !STEAM_APP_ID_PATTERN.test(record.steam_app_id) ||
    typeof record.steam_name !== "string" ||
    record.steam_name.trim().length === 0 ||
    !isCount(record.playtime_minutes) ||
    typeof record.matched !== "boolean" ||
    !isTimestamp(record.last_seen_at)
  ) {
    return null;
  }

  const game = record.game === null ? null : parseGame(record.game);
  if ((record.matched && game === null) || (!record.matched && record.game !== null)) {
    return null;
  }

  return {
    steam_app_id: record.steam_app_id,
    steam_name: record.steam_name,
    playtime_minutes: record.playtime_minutes,
    matched: record.matched,
    game,
    last_seen_at: record.last_seen_at,
  };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPageLimit(value: unknown): value is number {
  return isCount(value) && value >= 1 && value <= 200;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}
