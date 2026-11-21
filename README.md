# Ironfall: Frontline

A co-op three-lane MOBA shooter built on the Ironfall engine. You fight as a pilot on foot or in vehicles alongside AI teammates (or up to three friends) against the Hegemony, across five planets: Halcyon, Rust, Pale, Brume and Cinder.

## Play

Online: https://mbyrtus-maker.github.io/IronfallFrontier/ (GitHub Pages, from `docs/` on `main`).

Locally:

`docs/index.html` is the built game: one self-contained page plus the `docs/music/` folder. The game fetches the music over HTTP, so serve the folder rather than opening the file directly:

```sh
tools/serve.sh          # then open http://localhost:8123/index.html
```

URL options: `?frontline=1`, `?planet=pale`, `?showcase=1` (every unit, your weapons live), `?nocine=1` (skip the opening cinematic).

## Layout

| Path | What it is |
|---|---|
| `frontline/src/packages/sim/src/` | The simulation: match rules, units, weapons, AI, progression, support calls (runs in a worker, 20 ticks/s) |
| `frontline/src/packages/client/src/` | The client: rendering, meshes, effects, audio, music, UI, loadout, cinematic |
| `frontline/data/` | Game data: units, weapons, buildings, planets, support calls, progression, constants |
| `frontline/samples/` | Mastered sound effects (base64); `samples_orig/` holds the recordings before mastering |
| `frontline/music_src/` | The music plan and track list (the original MP3s are not in the repo) |
| `halcyon/index.html` | The page shell the build fills in |
| `docs/` | The built game and the mastered music |
| `tools/` | Build, local server, smoke test, headless sim tests, model renderers, audio mastering |
| `blender/` | The Blender scene script for the mech concept render |

## Build

```sh
node tools/build.js halcyon/index.html frontline docs/index.html "build label"
```

The build swaps the sources, data and samples into the page shell. Nothing needs installing beyond Node.

## Checks

```sh
python3 tools/smoke.py "http://localhost:8123/index.html?frontline=1" /tmp/smoke   # loads a match in headless Chrome (Playwright); "ERR:" with nothing after it is a pass
node tools/tests/t_gunners.js                                                        # headless sim tests, one behaviour each
node tools/render/render_kind.js scout /tmp/scout.png "" '[[35,20]]'                 # renders a model offline
node tools/render/zfight.js core factory                                             # lists flickering (coplanar) faces in models
```

## Audio

- `tools/audio/master_samples.py` masters the sound effects in `frontline/samples_orig/` into `frontline/samples/` (noise reduction, tail shaping, per-family tone matching, loudness).
- `tools/audio/master_music.py` masters the combat and planet tracks to match the opening theme (needs the original MP3s in `frontline/music_src/`).
