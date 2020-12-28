import playwright = require('playwright')
import fs = require('fs')

(async () => {
  try { fs.unlinkSync('*-?.png') } catch (e) { }
  for (const browserType of ['chromium', 'firefox', 'webkit']) {
    process.stdout.write(`Testing ${browserType}: `)
    const browser = await playwright[browserType].launch()
    const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } })
    const page = await context.newPage()
    try {
      await page.goto('http://localhost:1939/', 'networkidle')
    }
    catch (err) {
      process.stdout.write(`${err.message}\r\n`)
      process.stdout.write('forgot to `npm start`?')
      process.exit(1)
    }
    try {
      await page.setViewportSize({ width: 1920, height: 1080 })
      const frame = page.frames().find(frame => frame.name() === 'Info')
      await frame.focus('text=Xterm.js')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${browserType}-1.png` })
      //await page.keyboard.press('Enter')
      await frame.click('text=/^CONNECT$/')
      await page.waitForTimeout(500)

      await frame.focus('text=cursor')
      await frame.click('text=/^NEW$/')
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${browserType}-2.png` })

      await frame.focus('text=/Shall we begin/')
      await frame.focus('text=/SPACE BAR/')
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${browserType}-3.png` })
      await page.click('div#terminal')
      await page.keyboard.press('Control+D')

      await frame.focus('text=Xterm.js')
      await page.click('div#terminal')
      await page.keyboard.press('Escape')
      await page.focus('text=Hurst')
      await page.setViewportSize({ width: 640, height: 480 })
      await page.screenshot({ path: `${browserType}-4.png` })
    }
    catch (err) {
      process.stdout.write(`${err.message}\r\n`)
    }
    await browser.close()
  }
})()
