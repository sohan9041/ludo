# Ludo

Full Ludo game: React + TypeScript (Vite) front end, Node WebSocket server for online rooms.

## Features

- 15×15 SVG board, 4 colour bases, safe squares, home columns
- Complete rules: 6 to leave base, bonus roll on 6 / capture / finishing, three 6s lose the turn,
  safe squares, blockades (two tokens block passage), exact roll to finish, ranking for 2–4 players
- Local pass-and-play (2–4 players) and online rooms (create / join by code or invite link)
- Server-authoritative engine: dice are rolled on the server, clients only send intents
- Reconnect handling: session saved in `localStorage`, automatic exponential-backoff reconnect,
  seats kept while a game is in progress, lobby seats freed after 60 s, empty rooms cleaned up
- Token/dice animations, synthesised sound effects (mutable), responsive mobile/desktop layout

## Development

```bash
npm install
npm run dev        # Vite on :5173 (proxies /ws) + server on :3001
npm test           # rules engine tests (vitest)
npm run lint       # oxlint
npm run typecheck  # tsc -b
```

## Production

```bash
npm run build      # -> dist/
npm start          # serves dist/ and the WebSocket endpoint on $PORT (default 3001)
```

Set `VITE_WS_URL` at build time if the WebSocket server is hosted separately from the static files.

## Layout

```
src/game/      pure rules engine (shared by client and server)
src/components UI: Board, Token, Dice, GameScreen, Menu, Lobby
src/net/       protocol types + useRoom (WebSocket client with reconnect)
server/        room server (ws), also serves dist/ in production
```
