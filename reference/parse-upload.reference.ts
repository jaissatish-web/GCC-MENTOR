import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_FILE_SIZE_PDF = 5 * 1024 * 1024   // 5MB
const MAX_FILE_SIZE_DOCX = 2 * 1024 * 1024  // 2MB

const RESUME_PARSE_SYSTEM_PROMPT = `You are a resume parser for HireCircuit, a Gulf career platform for professionals seeking jobs in UAE, Saudi Arabia, Qatar, Kuwait, Oman, and Bahrain.

Your job: Extract ALL information from the provided resume text and return a JSON object matching the EXACT schema below.

RULES:
1. Return ONLY a valid JSON object. No explanation, no markdown, no backticks, no extra text.
2. If a field is not found in the resume, set it to null (for strings/booleans) or [] (for arrays) or {} (for objects).
3. For gulf_fields: actively look for visa status, iqama, NOC, driving licence, salary expectations, accommodation preferences, notice period.
4. For experience.highlights: preserve each bullet point as a separate string in the array.
5. For skills: categorize into technical, software, standards, and soft.
6. For dates: use YYYY-MM format. If current job, use "present" for end_date.
7. Generate unique IDs like "exp-1", "edu-1", "cert-1", "proj-1".
8. Set order field as sequential integers starting from 1.
9. Add Gulf countries mentioned to gulf_fields.target_countries.

REQUIRED OUTPUT SCHEMA:
{
  "personal": {"full_name":"string","email":"string or null","phone":"string or null","photo_url":null,"date_of_birth":"string or null","nationality":"string or null","marital_status":"string or null","address":"string or null"},
  "gulf_fields": {"visa_status":"string or null","iqama_transferable":"boolean or null","notice_period":"string or null","gcc_driving_licence":"string or null","current_location":"string or null","noc_available":"boolean or null","expected_salary":"string or null","accommodation_pref":"string or null","target_countries":[]},
  "summary": "string",
  "experience": [{"id":"string","order":1,"job_title":"string","company":"string","location":"string","start_date":"string","end_date":"string","highlights":["string"]}],
  "education": [{"id":"string","order":1,"degree":"string","institution":"string","location":"string or null","year":"string","gpa":"string or null"}],
  "skills": {"technical":["string"],"software":["string"],"standards":["string"],"soft":["string"]},
  "certifications": [{"id":"string","order":1,"name":"string","issuer":"string or null","year":"string or null","expiry":"string or null"}],
  "projects": [{"id":"string","order":1,"name":"string","client":"string or null","role":"string or null","value":"string or null","description":"string or null"}]
}`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name.toLowerCase()
  const fileExt = fileName.split('.').pop()

  if (!['pdf', 'docx', 'doc'].includes(fileExt || '')) {
    return NextResponse.json({ error: 'Only PDF and Word files are supported' }, { status: 400 })
  }

  if (fileExt === 'pdf' && buffer.length > MAX_FILE_SIZE_PDF) {
    return NextResponse.json({ error: 'PDF file must be under 5MB' }, { status: 400 })
  }

  if (['docx', 'doc'].includes(fileExt || '') && buffer.length > MAX_FILE_SIZE_DOCX) {
    return NextResponse.json({ error: 'Word file must be under 2MB' }, { status: 400 })
  }

  let extractedText = ''

  try {
    if (fileExt === 'pdf') {
      // Dynamic import to avoid webpack issues
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    } else if (fileExt === 'docx' || fileExt === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }
  } catch (err) {
    console.error('Text extraction error:', err)
    return NextResponse.json({ error: 'Could not read file. Try copy-paste instead.' }, { status: 422 })
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract text from file. Try copy-paste instead.' }, { status: 422 })
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: RESUME_PARSE_SYSTEM_PROMPT },
      { role: 'user', content: `Parse this resume:\n\n${extractedText}` },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')

  if (!parsed.personal?.full_name) {
    return NextResponse.json({ error: 'Could not extract name from resume' }, { status: 422 })
  }

  // Auto-fill profile from parsed resume (only empty fields — never overwrite)
  let profileAutoFilled = false
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('full_name, phone, visa_status, current_location, salary_expectation, nationality')
      .eq('user_id', user.id)
      .single()

    const profileUpdate: Record<string, unknown> = {}
    const p = parsed.personal as Record<string, string> | null
    const g = parsed.gulf_fields as Record<string, string> | null

    if (p?.full_name && !existingProfile?.full_name)                  profileUpdate.full_name = p.full_name
    if (p?.phone && !existingProfile?.phone)                          profileUpdate.phone = p.phone
    if (p?.nationality && !existingProfile?.nationality)              profileUpdate.nationality = p.nationality
    if (g?.visa_status && !existingProfile?.visa_status)              profileUpdate.visa_status = g.visa_status
    if (g?.current_location && !existingProfile?.current_location)    profileUpdate.current_location = g.current_location
    if (g?.expected_salary && !existingProfile?.salary_expectation)   profileUpdate.salary_expectation = g.expected_salary

    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.user_id = user.id
      await supabase.from('profiles').upsert(profileUpdate, { onConflict: 'user_id' })
      profileAutoFilled = true
    }
  } catch { /* non-fatal — parse succeeds even if profile update fails */ }

  return NextResponse.json({
    success: true,
    data: parsed,
    profile_updated: profileAutoFilled,
    tokens_used: response.usage?.total_tokens || 0,
  })
}
