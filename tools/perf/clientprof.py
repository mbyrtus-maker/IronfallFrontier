# Perf: CPU-profile the page's main thread during a Frontline match (first-person on foot, then command view).
import asyncio, json, sys, collections
from playwright.async_api import async_playwright
out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/prof"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 320, "height": 180})
        await pg.goto("http://localhost:8123/index.html?frontline=1"); await pg.wait_for_timeout(3000)
        await pg.click("#startBtn"); await pg.wait_for_timeout(4000)
        I = "window.__ironfall."
        await pg.evaluate(I + "cineSkip()"); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(1500)
        for _ in range(3):
            if await pg.evaluate("getComputedStyle(document.getElementById('pause')).display !== 'none'"): await pg.keyboard.press("Escape"); await pg.wait_for_timeout(800)
        await pg.wait_for_timeout(20000)
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", {"interval": 200})
        fr0 = await pg.evaluate("new Promise(r=>{let n=0,t=performance.now();function f(){n++; if(performance.now()-t<5000) requestAnimationFrame(f); else r([n,performance.now()-t]);} requestAnimationFrame(f);})")
        await cdp.send("Profiler.start")
        fr = await pg.evaluate("new Promise(r=>{let n=0,t=performance.now(),mx=0,l=t;function f(){const q=performance.now();mx=Math.max(mx,q-l);l=q;n++; if(q-t<15000) requestAnimationFrame(f); else r([n,q-t,mx]);} requestAnimationFrame(f);})")
        prof = (await cdp.send("Profiler.stop"))["profile"]
        json.dump(prof, open(out + ".cpuprofile", "w"))
        print("frames", fr, "fps", round(fr[0] / fr[1] * 1000, 1))
        nodes = {n["id"]: n for n in prof["nodes"]}
        self_t = collections.Counter(); dts = prof["timeDeltas"]; tot = 0
        for s, dt in zip(prof["samples"], dts):
            n = nodes[s]; cf = n["callFrame"]; self_t[(cf["functionName"] or "(anon)", cf["url"].split("/")[-1], cf["lineNumber"])] += dt; tot += dt
        print("total ms", tot / 1000)
        for k, v in self_t.most_common(45): print(f"{v/1000:8.1f} ms {100*v/tot:5.1f}%  {k[0]}  {k[1]}:{k[2]}")
        await b.close()
asyncio.run(main())
