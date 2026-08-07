import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx'
import type { ResumeDocument } from '@/lib/resumeDocument'
import { T, SIZE } from '@/components/templates/tokens'

/**
 * buildResumeDocx — the DOCX renderer (TASK-032).
 *
 * Pure rendering: consumes the shared, already-derived ResumeDocument from
 * lib/resumeDocument.ts (the SAME structure the PDF renderer GulfPremium uses)
 * and maps it onto the `docx` library's native paragraph constructs. It derives
 * NOTHING about the content — no visibility logic, no joins, no ordering, no
 * visa folding — that all lives in buildResumeDocument, which is what guarantees
 * the PDF and DOCX never drift. "Same data, different format" is enforced by
 * construction: this function has no way to disagree with GulfPremium about
 * what a document says.
 *
 * Fidelity note: DOCX is a different layout engine and is not a pixel-identical
 * clone of the PDF — that is intentional. What matches 1:1 is the content and
 * its structure: same sections in the same order, same visibility decisions,
 * same text, same bullets, same ordering. A clean, professional, recruiter-
 * editable Word document is the goal.
 *
 * Uses the already-present dependency `docx` (^9.0.2 in package.json) — no new
 * package was added for this ticket. Colours are mirrored from tokens.ts as
 * hex-without-# (the docx run `color` format); spacing uses readable half-point
 * sizes rather than chasing exact px-to-twip parity.
 */

const HE = (px: string): number => Math.round(parseFloat(px) * 2) // px → half-points

function sectionLabel(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        allCaps: true,
        characterSpacing: 20,
        color: T.inkWarm.replace('#', ''),
        size: HE(SIZE.sectionLabel),
      }),
    ],
  })
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({
        text,
        size: HE(SIZE.body),
        color: T.inkBody.replace('#', ''),
      }),
    ],
  })
}

export function buildResumeDocx(doc: ResumeDocument): Document {
  const { header, summary, experience, skills, certifications, education, additional } = doc
  const children: Paragraph[] = []

  // ---- Header: name / target title / identity lines ------------------------
  if (header.displayName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: header.displayName,
            bold: true,
            size: 48, // 24pt
            color: T.midnight.replace('#', ''),
          }),
        ],
      })
    )
  }
  if (header.targetJobTitle) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: header.targetJobTitle,
            bold: true,
            allCaps: true,
            characterSpacing: 20,
            size: 22,
            color: T.goldText.replace('#', ''),
          }),
        ],
      })
    )
  }
  for (const text of [header.identityPrimary, header.identityContact, header.identityGulf]) {
    if (text) {
      children.push(
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text, size: 20, color: T.inkMuted.replace('#', '') })],
        })
      )
    }
  }

  // ---- Sections -------------------------------------------------------------
  if (summary) children.push(sectionLabel('Professional summary'), body(summary))

  if (experience.length > 0) {
    children.push(sectionLabel('Experience'))
    for (const e of experience) {
      const { entry } = e
      const roleRuns: TextRun[] = []
      if (entry.role) {
        roleRuns.push(
          new TextRun({ text: entry.role, bold: true, size: 23, color: T.midnight.replace('#', '') })
        )
      }
      children.push(
        new Paragraph({ spacing: { before: 60, after: 20 }, children: roleRuns })
      )
      // A compact right-aligned range writes cleanly and stays editable in Word
      // (true left/right first-line alignment is unreliable across versions).
      if (e.range) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 20 },
            children: [new TextRun({ text: e.range, size: 19, color: T.inkMuted.replace('#', '') })],
          })
        )
      }
      if (e.companyLine) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: e.companyLine, size: 20, color: T.inkMuted.replace('#', '') }),
            ],
          })
        )
      }
      if (entry.description) children.push(body(entry.description))
      for (const b of e.bullets) {
        children.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: '•  ', color: T.inkBody.replace('#', '') }),
              new TextRun({ text: b, size: 21, color: T.inkBody.replace('#', '') }),
            ],
          })
        )
      }
    }
  }

  if (skills.length > 0) {
    children.push(sectionLabel('Key skills'), body(skills.map((s) => s.name).join(' · ')))
  }

  if (certifications.length > 0) {
    children.push(sectionLabel('Certifications'))
    for (const c of certifications) children.push(body(c.display))
  }

  if (education.length > 0) {
    children.push(sectionLabel('Education'))
    for (const ed of education) {
      const line = ed.years ? `${ed.line} (${ed.years})` : ed.line
      children.push(body(line))
    }
  }

  if (additional.length > 0) {
    children.push(sectionLabel('Additional information'))
    for (const a of additional) children.push(body(a.display))
  }

  return new Document({
    sections: [{ properties: {}, children }],
  })
}
