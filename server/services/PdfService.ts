import puppeteer, { type Browser } from 'puppeteer'

let _browser: Browser | null = null

async function getBrowser() {
  if (_browser) return _browser
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  return _browser
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
