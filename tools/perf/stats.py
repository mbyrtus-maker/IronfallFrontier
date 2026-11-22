# Perf: frame stats (cpu ms, draws, triangles) at a few camera setups, small viewport so SwiftShader raster doesn't dominate.
import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": int(sys.argv[1]) if len(sys.argv) > 1 else 480, "height": int(sys.argv[2]) if len(sys.argv) > 2 else 270})
        await pg.goto("http://localhost:8123/index.html?frontline=1"); await pg.wait_for_timeout(3000)
        await pg.click("#startBtn"); await pg.wait_for_timeout(4000)
        I = "window.__ironfall."
        await pg.evaluate(I + "cineSkip()"); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(1500)
        for _ in range(3):
            if await pg.evaluate("getComputedStyle(document.getElementById('pause')).display !== 'none'"): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(800)
        await pg.wait_for_timeout(15000)
        for label in ["core", "core2"]:
            await pg.wait_for_timeout(4000)
            s = await pg.evaluate(I + "getState()")
            fl = await pg.evaluate("(()=>{const L=window.__ironfall.frameLog?window.__ironfall.frameLog():null;return L})()")
            print(label, json.dumps({k: s[k] for k in ["fps", "frameMs", "cpuMs", "drawCalls", "triangles", "entitiesRendered", "fxLive"]}), json.dumps(s.get("lod")), json.dumps(s["worker"])[:300])
        await b.close()
asyncio.run(main())
