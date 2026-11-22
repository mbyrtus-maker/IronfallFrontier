# Perf: the same frame with terrain LOD off and on (screenshots + triangle counts), in first person and the command view.
import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 960, "height": 540})
        await pg.goto("http://localhost:8123/index.html?frontline=1" + (("&battle=" + sys.argv[1]) if len(sys.argv) > 1 else "")); await pg.wait_for_timeout(3000)
        await pg.click("#startBtn"); await pg.wait_for_timeout(4000)
        I = "window.__ironfall."
        await pg.evaluate(I + "cineSkip()"); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(1500)
        for _ in range(3):
            if await pg.evaluate("getComputedStyle(document.getElementById('pause')).display !== 'none'"): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(800)
        await pg.wait_for_timeout(8000)
        await pg.evaluate(I + "triBy(true)")
        shots = [("fp", None), ("hill", "[[1500,140,2300],[1500,40,900]]"), ("cmd", "[[1500,2400,2900],[1500,0,1400]]")]
        for name, cam in shots:
            if cam: await pg.evaluate(f"{I}freeCam(...{cam})")
            for on in [False, True]:
                await pg.evaluate(f"{I}terrainLod({'true' if on else 'false'})"); await pg.wait_for_timeout(2500)
                st = await pg.evaluate(I + "getState()"); c = await pg.evaluate(I + "cullStats()"); t = await pg.evaluate(I + "triBy()")
                print(name, "lod" if on else "full", "tris", st["triangles"], "terrain", round(t.get("terrain", 0)), "draws", st["drawCalls"], json.dumps(c))
                await pg.screenshot(path=f"/tmp/lod_{name}_{int(on)}{sys.argv[1] if len(sys.argv) > 1 else ""}.png")
        print("err:", await pg.evaluate("document.getElementById('err').textContent"))
        await b.close()
asyncio.run(main())
