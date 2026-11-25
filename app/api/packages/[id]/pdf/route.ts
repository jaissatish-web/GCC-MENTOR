import { downloadFileName } from '@/lib/downloadName'
import { NextRequest, NextResponse } from 'next/server'
import { renderPackagePdf } from '@/lib/pdf/renderPackage'
import { createClient } from '@/lib/supabase/server'
import { appendPackageEventAtomic } from '@/lib/packages/serverWrites'

// The shared renderer enforces ownership and uses the saved document/template.
// Chrome's cold start needs the Node runtime and more than the default timeout.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest, props0: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props0.params;
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packageId = params.id
  if (typeof packageId !== 'string' || packageId.trim() === '') {
    return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })
  }

  const r = await renderPackagePdf({ supabase, userId: user.id, packageId })
  if (!r.ok) {
    // The reason is returned, not just logged: this download is a plain link,
    // so a failure is a page the user is looking at (TASK-122 reasoning).
    return NextResponse.json(
      r.detail ? { error: r.error, detail: r.detail, hint: 'Send this whole message when reporting the problem — the detail line names the actual cause.' } : { error: r.error },
      { status: r.status },
    )
  }

  // Service history (migration 050), de-duplicated: a re-download within ten
  // minutes adds no second event, and a failure never blocks the download.
  await appendPackageEventAtomic({
    packageId,
    userId: user.id,
    type: 'pdf_downloaded',
    label: 'PDF downloaded',
    dedupeSeconds: 600,
  }).catch((e) => console.error('pdf: history event not recorded pkg=' + packageId, e instanceof Error ? e.message : String(e)))

  const safeName = downloadFileName(r.profile.full_name, r.pkg.target_job_title)
  return new NextResponse(Buffer.from(r.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
    },
  })
}
