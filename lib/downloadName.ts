/**
 * The file name a recruiter sees in their downloads folder (2026-09-18).
 *
 * It used to be the job title alone — "Instrumentation_Control_IC_Engineer.pdf"
 * — so a recruiter holding forty applications for that job held forty files
 * with the same name, none of them saying whose it was. Name first, then role.
 */
export function downloadFileName(fullName: string | null | undefined, jobTitle: string | null | undefined): string {
  const clean = (s: string | null | undefined) =>
    (s ?? '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9\-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
  const name = clean(fullName).slice(0, 60)
  const role = clean(jobTitle).slice(0, 60)
  return [name, role].filter(Boolean).join('_') || 'resume'
}
