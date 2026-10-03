import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import { launchBrowser } from '@/lib/pdf/browser'

/**
 * A cover letter as the file a Gulf applicant actually sends (2026-10-03,
 * launch audit I3): the only download was a .txt file, and recruiters and
 * portals expect PDF or Word. The letter's own text is the content, exactly as
 * the user saved it — dated, one page, plain business-letter layout.
 */

/** Paragraphs are separated by a blank line; lines inside one (the sign-off block) are kept. */
export function letterParagraphs(fullText: string): string[][] {
  return fullText
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length > 0)
}

export function letterDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function letterDocx(fullText: string, now: Date = new Date()): Promise<Buffer> {
  const run = (text: string, opts: { break?: number } = {}) => new TextRun({ text, font: 'Calibri', size: 22, ...opts })
  const children = [
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [run(letterDate(now))] }),
    ...letterParagraphs(fullText).map(
      (lines) =>
        new Paragraph({
          spacing: { after: 200, line: 276 },
          children: lines.map((l, i) => run(l, i === 0 ? {} : { break: 1 })),
        }),
    ),
  ]
  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } }, children }],
  })
  return Packer.toBuffer(doc)
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function letterHtml(fullText: string, now: Date = new Date()): string {
  const paras = letterParagraphs(fullText)
    .map((lines) => `<p>${lines.map(escapeHtml).join('<br>')}</p>`)
    .join('\n')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 23mm 23mm; }
body { font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #1a1a1a; margin: 0; }
.date { text-align: right; margin: 0 0 16pt; }
p { margin: 0 0 11pt; }
</style></head><body><p class="date">${escapeHtml(letterDate(now))}</p>
${paras}
</body></html>`
}

export async function letterPdf(fullText: string, now: Date = new Date()): Promise<Uint8Array> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(letterHtml(fullText, now), { waitUntil: 'domcontentloaded' })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    await browser.close().catch(() => {})
  }
}
