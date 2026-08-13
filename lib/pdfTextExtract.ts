// Direct PDF text extraction — no external dependencies.
// Extracts text from PDF stream objects between BT/ET operators.
// Works on any text-based PDF. Image-only PDFs return empty string.

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1')

  // Verify PDF header
  if (!raw.startsWith('%PDF-')) return ''

  // Method 1: Extract text from stream objects
  // PDF streams are between "stream\n" and "\nendstream"
  const streams: string[] = []
  let pos = 0

  while (pos < raw.length) {
    const streamStart = raw.indexOf('stream\n', pos)
    if (streamStart === -1) break
    const dataStart = streamStart + 7
    const streamEnd = raw.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    // Get the raw stream data (skip \n before endstream)
    let dataEnd = streamEnd
    if (raw[dataEnd - 1] === '\n') dataEnd--

    const streamData = raw.slice(dataStart, dataEnd)
    streams.push(streamData)
    pos = streamEnd + 9
  }

  // Method 2: Extract text from uncompressed streams between BT/ET
  const textParts: string[] = []

  for (const stream of streams) {
    // PDF text blocks: BT ... ET
    let btPos = 0
    while (btPos < stream.length) {
      const btIdx = stream.indexOf('BT', btPos)
      if (btIdx === -1) break
      const etIdx = stream.indexOf('ET', btIdx)
      if (etIdx === -1) break

      const block = stream.slice(btIdx + 2, etIdx)

      // Extract text between parentheses: (text) — Tj operator
      const tjRegex = /\(([^)]*)\)\s*Tj/g
      let tjMatch
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const text = tjMatch[1]
          // Handle PDF escape sequences
          .replace(/\\([()\\])/g, '$1')
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
        if (text.trim()) textParts.push(text)
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
          if (text.trim()) textParts.push(text)
        }
      }

      btPos = etIdx + 2
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

// Export for use in route
export { extractPdfText }