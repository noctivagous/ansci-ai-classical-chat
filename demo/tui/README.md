# TUI (placeholder)

```sh
node demo/tui/tui.mjs
```

This is a placeholder, not a terminal UI. It prints a banner, says so,
and hands you to the working command-line chat
(`node dist/src/cskg/chat.js`) — same graph, same answers, plain
prompt — so you end up chatting either way.

## What a full TUI will be

A keyboard-driven terminal front end over the same CSKG chat engine
(`src/cskg/converse.ts`), in the spirit of the chat it will sit beside:

- a conversation pane with the same grounded answers the web UI gives;
- a side pane showing the thought trace behind the last answer — the
  edges the answer rests on — which the engine already records for
  every turn (the CLI shows it today with `--debug`);
- a header carrying the situated state: place, season, daypart, time;
- no new reasoning of its own — presentation only, like the web UI.

## Why a placeholder

The web UI and the CLI already prove the chat itself; a TUI is a third
presentation of the same machinery. It is stubbed rather than built so
the demo has the shape the project intends — web, terminal UI, command
line — without a half-finished framework pretending to be one of the
three ways to chat. When it is built, it will replace `tui.mjs` here
without touching the engine.
