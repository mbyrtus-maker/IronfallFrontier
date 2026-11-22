# Perf: frames per second (SwiftShader, small window) with the LOD on and off, same session and camera.
import asyncio, json, sys
from playwright.async_api import async_playwright
FR = "new Promise(r=>{let n=0,t=performance.now();function f(){n++; if(performance.now()-t<12000) requestAnimationFrame(f); else r(n*1000/(performance.now()-t));} requestAnimationFrame(f);})"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 480, "height": 270})
        await pg.goto("http://localhost:8123/index.html?frontline=1"); await pg.wait_for_timeout(3000)
        await pg.click("#startBtn"); await pg.wait_for_timeout(4000)
        I = "window.__ironfall."
        await pg.evaluate(I + "cineSkip()"); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(1500)
        for _ in range(3):
            if await pg.evaluate("getComputedStyle(document.getElementById('pause')).display !== 'none'"): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(800)
        await pg.evaluate(f"{I}freeCam([1500,140,2300],[1500,40,900])"); await pg.wait_for_timeout(3000)
        for on in [False, True, False, True]:
            await pg.evaluate(f"{I}terrainLod({'true' if on else 'false'})"); await pg.wait_for_timeout(1500)
            print("lod" if on else "full", round(await pg.evaluate(FR), 2), "fps", "cpu ms", round((await pg.evaluate(I + "getState()"))["cpuMs"], 2), flush=True)
        await b.close()
asyncio.run(main())
