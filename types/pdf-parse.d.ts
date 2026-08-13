// pdf-parse v2.x type declaration.
// v2 uses a PDFParse class, not a callable default export.
declare module 'pdf-parse' {
  interface PDFParseOptions {
    data: Buffer | Uint8Array
    verbosity?: number
    /** Page range: skip first N pages */
    first?: number
    /** Page range: skip last N pages */
    last?: number
    /** Specific page numbers to parse */
    partial?: number[]
    /** Threshold for line grouping (default 4.6) */
    lineThreshold?: number
    /** Threshold for cell separation (default 7) */
    cellThreshold?: number
    /** Cell separator character (default '\t') */
    cellSeparator?: string
    /** Whether to enforce line grouping */
    lineEnforce?: boolean
    /** Page joiner template */
    pageJoiner?: string
    /** Whether to parse hyperlinks into markdown */
    parseHyperlinks?: boolean
  }

  interface PDFTextResult {
    text: string
    pages: Array<{ text: string; num: number }>
    total: number
  }

  interface PDFPageLink {
    url: string
    text: string
  }

  interface PDFPageInfo {
    pageNumber: number
    links: PDFPageLink[]
    width: number
    height: number
    pageLabel?: string
  }

  interface PDFInfo {
    total: number
    info: Record<string, unknown> | null
    metadata: unknown
    fingerprints: string[]
    permission: unknown
    outline: unknown
    pages: PDFPageInfo[]
  }

  interface PDFImage {
    data: Uint8Array
    dataUrl: string
    name: string
    height: number
    width: number
    kind: number
  }

  interface PDFImagePage {
    pageNumber: number
    images: PDFImage[]
  }

  interface PDFImageResult {
    pages: PDFImagePage[]
    total: number
  }

  interface PDFTablePage {
    num: number
    tables: string[][][]
  }

  interface PDFTableResult {
    pages: PDFTablePage[]
    mergedTables: unknown[]
    total: number
  }

  interface PDFScreenshotPage {
    data: Uint8Array
    dataUrl: string
    pageNumber: number
    width: number
    height: number
    scale: number
  }

  interface PDFScreenshotResult {
    pages: PDFScreenshotPage[]
    total: number
  }

  class PDFParse {
    constructor(options: PDFParseOptions)
    getText(options?: Partial<PDFParseOptions>): Promise<PDFTextResult>
    getInfo(options?: { parsePageInfo?: boolean }): Promise<PDFInfo>
    getImage(options?: Partial<PDFParseOptions>): Promise<PDFImageResult>
    getTable(options?: Partial<PDFParseOptions>): Promise<PDFTableResult>
    getScreenshot(options?: Partial<PDFParseOptions>): Promise<PDFScreenshotResult>
    destroy(): Promise<void>
    load(): Promise<unknown>
    static setWorker(workerSrc: string | null): string | ''
    static get isNodeJS(): boolean
  }

  // Re-exported from pdf.js
  type VerbosityLevel = number
  class AbortException extends Error {}
  class FormatError extends Error {}
  class InvalidPDFException extends Error {}
  class PasswordException extends Error {}
  class ResponseException extends Error {}
  class UnknownErrorException extends Error {}

  export {
    PDFParse,
    AbortException,
    FormatError,
    InvalidPDFException,
    PasswordException,
    ResponseException,
    UnknownErrorException,
    VerbosityLevel,
  }
}