// Direct PDF text extraction — zero external dependencies.
// Handles BOTH uncompressed AND FlateDecode (zlib) compressed streams.
// All modern PDF generators (Word, Google Docs, Canva, resume builders)
// use FlateDecode compression — this handles those.

import { inflateSync } from 'zlib'

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1')

  // Verify PDF header
  if (!raw.startsWith('%PDF-')) return ''

  // Extract text from all stream objects (both compressed and uncompressed)
  const textParts: string[] = []
  let pos = 0

  while (pos < raw.length) {
    // Find the stream dictionary (the part before 'stream\n')
    const streamMarker = raw.indexOf('stream\n', pos)
    if (streamMarker === -1) break

    // Find dictionary start: look backwards from streamMarker for the object header
    // A stream dictionary is between '<<' and '>>' right before 'stream'
    const dictStart = raw.lastIndexOf('<<', streamMarker)
    const dictEnd = streamMarker
    const dict = dictStart !== -1 && dictStart > pos ? raw.slice(dictStart, dictEnd) : ''

    const dataStart = streamMarker + 7
    const streamEnd = raw.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    // Account for optional \r\n after 'stream' keyword and before 'endstream'
    let dataEnd = streamEnd
    if (dataEnd > 0 && raw[dataEnd - 1] === '\n') dataEnd--
    if (dataEnd > 0 && raw[dataEnd - 1] === '\r') dataEnd--

    let streamData: Buffer
    try {
      const rawData = Buffer.from(raw.slice(dataStart, dataEnd), 'latin1')

      // Check if this stream is FlateDecode compressed
      if (dict.includes('/FlateDecode')) {
        try {
          streamData = inflateSync(rawData)
        } catch {
          // Decompression failed — skip this stream
          pos = streamEnd + 9
          continue
        }
      } else {
        streamData = rawData
      }
    } catch {
      pos = streamEnd + 9
      continue
    }

    // Extract text from the (possibly decompressed) stream
    const streamStr = streamData.toString('latin1')
    extractTextFromContent(streamStr, textParts)

    pos = streamEnd + 9
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

function extractTextFromContent(content: string, parts: string[]): void {
  let btPos = 0
  while (btPos < content.length) {
    const btIdx = content.indexOf('BT', btPos)
    if (btIdx === -1) break
    const etIdx = content.indexOf('ET', btIdx)
    if (etIdx === -1) break

    const block = content.slice(btIdx + 2, etIdx)

    // Extract text between parentheses: (text) — Tj operator
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
      if (text.trim()) parts.push(text)
    }

    // Also try TJ operator (array of strings): [(text) number (text)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g
    let tjArrMatch
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arrContent = tjArrMatch[1]
      const strRegex = /\(([^)]*)\)/g
      let strMatch
      while ((strMatch = strRegex.exec(arrContent)) !== null) {
        const text = strMatch[1]
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\n/g, ' ')
        if (text.trim()) parts.push(text)
      }
    }

    btPos = etIdx + 2
  }
}

export { extractPdfText }