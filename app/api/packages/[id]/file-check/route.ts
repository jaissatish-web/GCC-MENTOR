import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPackagePdf } from '@/lib/pdf/renderPackage'
import { atsTextOfPdf, checkAtsText } from '@/lib/atsFileCheck'
import { getTemplate } from '@/lib/templates'

/**
 * POST /api/packages/[id]/file-check — "does my downloaded CV read correctly
 * in an ATS?" (founder, 2026-10-02).
 *
 * Renders EXACTLY the PDF the download gives (lib/pdf/renderPackage.ts, the
 * saved design and style), reads it back with a plain text extractor the way
 * an ATS does, and checks it against the CV (lib/atsFileCheck.ts). No model
 * call; a few seconds of Chrome. Owner-scoped like the download; not recorded
 * as a download.
 *
 * Answer: { report, template: { id, name }, ms }
 */
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: packageId } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!packageId?.trim()) return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })

  const t0 = Date.now()
  const r = await renderPackagePdf({ supabase, userId: user.id, packageId })
  if (!r.ok) return NextResponse.json({ error: r.status === 404 ? 'CV not found' : 'We could not build your PDF to check it. Please try again.' }, { status: r.status })
  try {
    const { text, pages } = await atsTextOfPdf(r.pdf)
    const keywords = ((r.pkg.match_report as { target?: { keywords?: Array<{ term: string }> } } | null)?.target?.keywords ?? []).map((k) => k.term)
    const report = checkAtsText(text, pages, r.document, keywords)
    const ms = Date.now() - t0
    console.log(`file-check: user=${user.id} pkg=${packageId} template=${r.templateId} status=${report.status} ms=${ms}`)
    return NextResponse.json({ report, template: { id: r.templateId, name: getTemplate(r.templateId).name }, ms })
  } catch (e) {
    console.error('file-check: read failed user=' + user.id + ' pkg=' + packageId, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'We could not read the PDF back. Please try again.' }, { status: 500 })
  }
}
