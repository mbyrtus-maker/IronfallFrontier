import asyncio, json, sys
from playwright.async_api import async_playwright
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
        await pg.wait_for_timeout(10000)
        await pg.evaluate(I + "triBy(true)"); await pg.wait_for_timeout(4000)
        t = await pg.evaluate(I + "triBy()"); s = await pg.evaluate(I + "getState()")
        print("err", await pg.evaluate("document.getElementById('err').textContent")); print("cull", json.dumps(await pg.evaluate(I+"cullStats()"))); print("total", s["triangles"], "draws", s["drawCalls"], "cpu", s["cpuMs"], "inside", json.dumps(await pg.evaluate(I+"flDrop()"))[:80])
        for k, v in sorted(t.items(), key=lambda kv: -kv[1])[:25]: print(f"{v:9.0f}  {k}")
        await pg.screenshot(path="/tmp/perf_view.png")
        await b.close()
asyncio.run(main())
