import { extractPdfText } from '@/lib/pdfTextExtract'

/**
 * Pull plain text out of an uploaded resume — PDF or DOCX — with NO model call and
 * NO persistence.
 *
 * This is text extraction, not the LLM structured extraction. PDF.js and mammoth
 * turn the file into characters; nothing here reaches a provider and nothing is
 * written to a database. It is exactly what the anonymous Gulf Readiness Scorecard
 * needs: the resume text to run the arithmetic engine on, seen transiently and then
 * discarded by the caller.
 *
 * The same guardrail the scan route learned the hard way applies: a PDF whose font
 * encoding cannot be decoded produces confident-looking NOISE that passes a length
 * check, so a garbled read is refused explicitly rather than scored.
 */

const MAX_PDF = 10 * 1024 * 1024
const MAX_DOCX = 5 * 1024 * 1024
const MIN_TEXT = 50

export type ResumeTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code: string }

export async function resumeTextFromFile(file: File): Promise<ResumeTextResult> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (!['pdf', 'docx', 'doc'].includes(ext)) {
    return { ok: false, error: 'Only PDF and Word files are supported.', code: 'BAD_TYPE' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (ext === 'pdf' && buffer.length > MAX_PDF) {
    return { ok: false, error: 'PDF file must be under 10MB.', code: 'TOO_BIG' }
  }
  if (ext !== 'pdf' && buffer.length > MAX_DOCX) {
    return { ok: false, error: 'Word file must be under 5MB.', code: 'TOO_BIG' }
  }

  try {
    if (ext === 'pdf') {
      if (buffer.slice(0, 5).toString() !== '%PDF-') {
        return { ok: false, error: 'This file does not appear to be a valid PDF.', code: 'NOT_PDF' }
      }
      const result = await extractPdfText(buffer, false)
      if (result.looksGarbled) {
        return {
          ok: false,
          code: 'PDF_UNREADABLE',
          error:
            'We could not read the text in this PDF reliably. Please upload a different export (Save as PDF from Word or Google Docs works well), or paste your resume text instead.',
        }
      }
      if (!result.text || result.text.trim().length < MIN_TEXT) {
        return {
          ok: false,
          code: 'PDF_NO_TEXT',
          error:
            'We could not read this PDF. Upload a text-based PDF or Word file, or paste your resume text instead.',
        }
      }
      return { ok: true, text: result.text }
    }

    const mammoth = await import('mammoth')
    const parsed = await mammoth.extractRawText({ buffer })
    if (!parsed.value || parsed.value.trim().length < MIN_TEXT) {
      return {
        ok: false,
        code: 'WORD_NO_TEXT',
        error: 'We could not read this file. Upload a valid file, or paste your resume text instead.',
      }
    }
    return { ok: true, text: parsed.value }
  } catch (e) {
    console.error('resumeTextFromFile failed:', e instanceof Error ? e.message : String(e))
    return {
      ok: false,
      code: 'PARSE_EXCEPTION',
      error: 'We could not read this file. Please paste your resume text instead.',
    }
  }
}
