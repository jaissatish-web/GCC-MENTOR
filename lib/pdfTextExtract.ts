// Direct PDF text extraction — zero external dependencies.
// Handles common PDF stream filters: FlateDecode, ASCII85Decode,
// ASCIIHexDecode, and chained filters (e.g. [/ASCII85Decode /FlateDecode]).
// All modern PDF generators (Word, Google Docs, Canva, resume builders)
// compress their streams — this decompresses them first.

import { inflateSync, inflateRawSync } from 'zlib'

export interface ExtractResult {
  text: string
  /** Diagnostic info — non-empty only when debugging is needed */
  filter?: string
  streamCount?: number
  errorCount?: number
}

function extractPdfText(buffer: Buffer, debug = false): ExtractResult {
  const raw = buffer.toString('latin1')
  const result: ExtractResult = { text: '' }
  if (debug) result.streamCount = 0

  if (!raw.startsWith('%PDF-')) return result

  const textParts: string[] = []
  let pos = 0
  let errors = 0

  while (pos < raw.length) {
    // Find stream: 'stream\n' or 'stream\r\n'
    let streamMarker = raw.indexOf('stream', pos)
    while (streamMarker !== -1) {
      const after = raw[streamMarker + 6]
      if (after === '\n' || after === '\r') break
      streamMarker = raw.indexOf('stream', streamMarker + 1)
    }
    if (streamMarker === -1) break

    // Determine the actual data start (skip 'stream\r\n' or 'stream\n')
    let dataStart = streamMarker + 7 // 'stream\n'
    if (raw[streamMarker + 6] === '\r' && raw[streamMarker + 7] === '\n') {
      dataStart = streamMarker + 8 // 'stream\r\n'
    } else if (raw[streamMarker + 6] === '\n') {
      dataStart = streamMarker + 7
    } else {
      pos = streamMarker + 6
      continue
    }

    const streamEnd = raw.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    // Find the stream dictionary (<< ... >> before stream)
    const dictStart = raw.lastIndexOf('<<', streamMarker)
    const dict = dictStart !== -1 && dictStart > pos ? raw.slice(dictStart, streamMarker) : ''

    // Trim trailing whitespace before endstream
    let dataEnd = streamEnd
    while (dataEnd > dataStart && (raw[dataEnd - 1] === '\n' || raw[dataEnd - 1] === '\r' || raw[dataEnd - 1] === ' ')) {
      dataEnd--
    }

    if (debug) result.streamCount!++

    let streamData: Buffer | null = null
    try {
      const rawData = Buffer.from(raw.slice(dataStart, dataEnd), 'latin1')
      streamData = decompressStream(rawData, dict)

      if (!streamData) {
        errors++
        if (debug && !result.filter && dict) result.filter = detectFilter(dict) ?? undefined
      }
    } catch {
      errors++
    }

    if (streamData) {
      const streamStr = streamData.toString('latin1')
      extractTextFromContent(streamStr, textParts)
    }

    pos = streamEnd + 9
  }

  if (debug) result.errorCount = errors
  result.text = textParts.join(' ').replace(/\s+/g, ' ').trim()
  return result
}

function decompressStream(data: Buffer, dict: string): Buffer | null {
  const filter = detectFilter(dict)
  if (!filter) return data

  // Multiple chained filters: e.g. [/ASCII85Decode /FlateDecode]
  // Apply in the order listed
  let current = data
  for (const f of filter.split('+')) {
    try {
      if (f === 'FlateDecode') {
        // Try standard zlib first, then raw deflate
        try {
          current = inflateSync(current)
        } catch {
          current = inflateRawSync(current)
        }
      } else if (f === 'ASCII85Decode') {
        current = decodeAscii85(current)
      } else if (f === 'ASCIIHexDecode') {
        current = decodeAsciiHex(current)
      }
      // LZWDecode, RunLengthDecode, etc. — unsupported for now
      // but most modern PDFs only use FlateDecode or ASCII85+FlateDecode
    } catch {
      return null
    }
  }

  return current
}

function detectFilter(dict: string): string | null {
  // Single filter: /Filter /FlateDecode
  const singleMatch = dict.match(/\/Filter\s*\/(\w+)/)
  if (singleMatch) return singleMatch[1]

  // Array of filters: /Filter [/ASCII85Decode /FlateDecode]
  const arrayMatch = dict.match(/\/Filter\s*\[([^\]]+)\]/)
  if (arrayMatch) {
    const filters = arrayMatch[1].match(/\/\w+/g)
    if (filters) return filters.map(f => f.slice(1)).join('+')
  }

  return null
}

function decodeAscii85(data: Buffer): Buffer {
  const text = data.toString('latin1')
  // Remove whitespace and the ~> end marker
  const cleaned = text.replace(/\s/g, '').replace(/~>$/, '')
  const result: number[] = []
  let group: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned.charCodeAt(i)
    if (ch < 33 || ch > 117) continue // skip invalid chars
    group.push(ch - 33)

    if (group.length === 5) {
      const n = group[0] * 85 * 85 * 85 * 85 +
                group[1] * 85 * 85 * 85 +
                group[2] * 85 * 85 +
                group[3] * 85 +
                group[4]
      result.push((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF)
      group = []
    }
  }

  // Handle remaining characters (padding implied)
  if (group.length > 0) {
    while (group.length < 5) group.push(84) // 84 = max value, padding
    const n = group[0] * 85 * 85 * 85 * 85 +
              group[1] * 85 * 85 * 85 +
              group[2] * 85 * 85 +
              group[3] * 85 +
              group[4]
    for (let j = 0; j < group.length - 1; j++) {
      result.push((n >> (24 - j * 8)) & 0xFF)
    }
  }

  return Buffer.from(result)
}

function decodeAsciiHex(data: Buffer): Buffer {
  const text = data.toString('latin1').replace(/\s/g, '')
  const result: number[] = []
  for (let i = 0; i < text.length - 1; i += 2) {
    const hex = text.slice(i, i + 2)
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      result.push(parseInt(hex, 16))
    }
  }
  return Buffer.from(result)
}

function extractTextFromContent(content: string, parts: string[]): void {
  let btPos = 0
  while (btPos < content.length) {
    const btIdx = content.indexOf('BT', btPos)
    if (btIdx === -1) break
    const etIdx = content.indexOf('ET', btIdx)
    if (etIdx === -1) break

    const block = content.slice(btIdx + 2, etIdx)

    // Extract text: (text) Tj
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

    // Extract text: [(text) num (text)] TJ
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