import http from "node:http";

const port = 8092;
const now = "2026-08-28T12:00:00Z";
const userId = "11111111-1111-4111-8111-111111111111";
const entryId = "22222222-2222-4222-8222-222222222222";
const secondEntryId = "33333333-3333-4333-8333-333333333333";
const firstEventId = "44444444-4444-4444-8444-444444444444";
const secondEventId = "55555555-5555-4555-8555-555555555555";
const syncJobId = "66666666-6666-4666-8666-666666666666";

const games = {
  hades: {
    igdb_id: 1000,
    name: "Hades",
    slug: "hades",
    summary: "Defy the god of the dead and fight out of the Underworld.",
    first_release_date: "2020-09-17",
    genres: ["Roguelike", "Action"],
    developers: ["Supergiant Games"],
    publishers: ["Supergiant Games"],
  },
  celeste: {
    igdb_id: 1001,
    name: "Celeste",
    slug: "celeste",
    summary: "Help Madeline survive her journey to the top of Celeste Mountain.",
    first_release_date: "2018-01-25",
    genres: ["Platform"],
    developers: ["Maddy Makes Games"],
    publishers: ["Maddy Makes Games"],
  },
};

const library = [
  libraryEntry(entryId, games.hades, "playing", 4.5, "Fast, focused, and memorable."),
  libraryEntry(secondEntryId, games.celeste, "completed", 5, "A precise and generous platformer."),
];

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const token = bearerToken(request);

  if (url.pathname === "/health") return json(response, 200, { status: "ok" });

  if (url.pathname === "/seed" && request.method === "GET") {
    const requestedPath = url.searchParams.get("next");
    const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/home";

    response.writeHead(302, {
      Location: `http://127.0.0.1:3001${nextPath}`,
      "Set-Cookie": [
        "playlog_at=e2e-connected; Path=/; HttpOnly; SameSite=Lax",
        "playlog_rt=e2e-refresh; Path=/; HttpOnly; SameSite=Lax",
        "playlog_at_exp=1798761600; Path=/; HttpOnly; SameSite=Lax",
      ],
    });
    return response.end();
  }

  if (url.pathname === "/auth/login" && request.method === "POST") {
    const body = await readJSON(request);
    if (body?.email !== "tester@playlog.local" || body?.password !== "PlaylogTest2026!") {
      return json(response, 401, { error: "invalid email or password" });
    }
    return json(response, 200, {
      access_token: "e2e-connected",
      refresh_token: "e2e-refresh",
      expires_in: 900,
    });
  }

  if (url.pathname === "/auth/register" && request.method === "POST") {
    const body = await readJSON(request);
    return json(response, 201, {
      id: userId,
      email: body?.email ?? "new@playlog.local",
      username: body?.username ?? "new_player",
    });
  }

  if (url.pathname === "/games/1000" && request.method === "GET") {
    return json(response, 200, {
      game: games.hades,
      stats: {
        backlog: 12,
        playing: 8,
        completed: 42,
        dropped: 2,
        total_logged: 64,
        rating_count: 40,
        average_rating: 4.6,
      },
      friends_activity: token
        ? [{ username: "fixture_player", status: "completed", rating: 5 }]
        : null,
    });
  }

  if (url.pathname === "/users/fixture_player" && request.method === "GET") {
    const profile = {
      username: "fixture_player",
      library: [library[1]],
      follower_count: 8,
      following_count: 5,
    };
    return json(response, 200, token ? { ...profile, is_following: false } : profile);
  }
  if (url.pathname === "/users/fixture_player/followers") {
    return json(response, 200, { followers: ["test_friend", "sample_user"] });
  }
  if (url.pathname === "/users/fixture_player/following") {
    return json(response, 200, { following: ["test_friend"] });
  }

  if (!token) return json(response, 401, { error: "missing or malformed authorization header" });

  if (url.pathname === "/auth/me") {
    return json(response, 200, { id: userId, email: "tester@playlog.local", verified: true });
  }
  if (url.pathname === "/auth/sessions") {
    return json(response, 200, {
      sessions: [{
        id: "77777777-7777-4777-8777-777777777777",
        created_at: "2026-08-20T09:30:00Z",
        expires_at: "2026-09-19T09:30:00Z",
        current: true,
      }],
    });
  }
  if (url.pathname === "/games/search") {
    return json(response, 200, { games: [games.hades, games.celeste] });
  }
  if (url.pathname === "/library" && request.method === "GET") {
    return json(response, 200, { library });
  }
  if (url.pathname === "/library" && request.method === "POST") {
    const body = await readJSON(request);
    return json(response, 201, libraryEntry(
      "88888888-8888-4888-8888-888888888888",
      Number(body?.igdb_id) === games.celeste.igdb_id ? games.celeste : games.hades,
      body?.status ?? "backlog",
      body?.rating ?? null,
      body?.review ?? null,
    ));
  }
  if (url.pathname.startsWith("/library/") && request.method === "PATCH") {
    const body = await readJSON(request);
    return json(response, 200, {
      ...library[0],
      ...body,
      updated_at: "2026-08-28T12:05:00Z",
    });
  }
  if (url.pathname === "/feed") {
    const secondPage = url.searchParams.has("cursor");
    return json(response, 200, secondPage
      ? { events: [feedEvent(secondEventId, "reviewed", games.celeste)], next_cursor: null }
      : { events: [feedEvent(firstEventId, "rated", games.hades)], next_cursor: "fixture-cursor" });
  }
  if (url.pathname === "/users/fixture_player/follow" && ["POST", "DELETE"].includes(request.method ?? "")) {
    response.writeHead(204);
    response.end();
    return;
  }
  if (url.pathname === "/connections/steam" && request.method === "GET") {
    return json(response, 200, token.includes("disconnected")
      ? { connected: false, game_count: 0 }
      : {
          connected: true,
          steam_id: "76561198000000000",
          connected_at: "2026-08-20T09:30:00Z",
          last_synced_at: now,
          game_count: 3,
        });
  }
  if (url.pathname === "/connections/steam/library") {
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const steamGames = [
      steamItem("1145360", "Hades", 3780, games.hades),
      steamItem("504230", "Celeste", 1260, games.celeste),
      steamItem("999999", "Unmatched Fixture", 45, null),
    ];
    return json(response, 200, {
      games: steamGames.slice(offset, offset + limit),
      total: steamGames.length,
      limit,
      offset,
    });
  }
  if (url.pathname === "/connections/steam/sync" && request.method === "POST") {
    return json(response, 202, completedSyncJob());
  }
  if (url.pathname === `/connections/steam/sync/${syncJobId}`) {
    return json(response, 200, completedSyncJob());
  }
  if (url.pathname === "/connections/steam" && request.method === "DELETE") {
    response.writeHead(204);
    response.end();
    return;
  }

  return json(response, 404, { error: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Playlog E2E fixture API listening on http://127.0.0.1:${port}`);
});

function bearerToken(request) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function libraryEntry(id, game, status, rating, review) {
  return {
    id,
    status,
    rating,
    review,
    started_at: "2026-08-01",
    completed_at: status === "completed" ? "2026-08-20" : null,
    game,
    created_at: now,
    updated_at: now,
  };
}

function feedEvent(id, eventType, game) {
  return {
    id,
    username: "fixture_player",
    event_type: eventType,
    status: eventType === "rated" ? null : "completed",
    rating: eventType === "rated" ? 5 : null,
    review: eventType === "reviewed" ? "Worth remembering." : null,
    created_at: now,
    game: { igdb_id: game.igdb_id, name: game.name, cover_url: "" },
  };
}

function steamItem(appId, name, playtime, game) {
  return {
    steam_app_id: appId,
    steam_name: name,
    playtime_minutes: playtime,
    matched: game !== null,
    game,
    last_seen_at: now,
  };
}

function completedSyncJob() {
  return {
    id: syncJobId,
    status: "completed",
    total_count: 3,
    matched_count: 2,
    unmatched_count: 1,
    error: null,
    started_at: "2026-08-28T11:59:55Z",
    completed_at: now,
    created_at: "2026-08-28T11:59:50Z",
  };
}

async function readJSON(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}
