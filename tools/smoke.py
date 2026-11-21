import sys, asyncio, json
from playwright.async_api import async_playwright
url, out = sys.argv[1], sys.argv[2]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 1280, "height": 720})
        logs = []
        pg.on("pageerror", lambda e: logs.append("PAGEERROR " + str(e)))
        await pg.goto(url); await pg.wait_for_timeout(3000)
        await pg.click("#startBtn"); await pg.wait_for_timeout(12000)
        print("objective:", await pg.evaluate("document.getElementById('objective').textContent"))
        m = await pg.evaluate("window.__ironfall.flMap()"); print("wave", json.dumps(m["wave"]))
        await pg.screenshot(path=out + "-0.png", clip={"x": 300, "y": 0, "width": 680, "height": 70})
        print("ERR:", await pg.evaluate("document.getElementById('err').textContent"))
        for l in logs[-6:]: print(l[:300])
        await b.close()
asyncio.run(main())
