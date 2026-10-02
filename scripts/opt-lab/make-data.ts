/**
 * Optimizer test lab — test data (2026-10-02).
 *
 *   node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/make-data.ts
 *
 * Writes scripts/opt-lab/data/profiles.json and jobs.json: 15 FAKE career
 * profiles (invented people, realistic Gulf careers, 3–6 roles each, varied
 * bullets — real users' size, unlike the 2-role eval fixtures) and one realistic
 * Gulf job advert per target title. Generated once by the configured model and
 * committed, so every run of the lab scores the same inputs.
 */
import '../resolve-paths'
import fs from 'node:fs'
import path from 'node:path'
import { generate } from '../../lib/ai/provider'
import { extractJsonObject } from '../../lib/ai/extractionPrompt'
import { FAST_HOSTS } from '../../lib/resumeParse/pipeline'

const OUT = path.join(__dirname, 'data')

export const PROFILE_SPECS: Array<{ key: string; brief: string }> = [
  { key: 'mep_mech', brief: 'Mechanical / MEP engineer, 11 years, 5 roles (UAE, Qatar, India): HVAC, chilled water, plumbing, fire fighting, site supervision' },
  { key: 'electrical', brief: 'Electrical engineer, 9 years, 5 roles (Saudi, UAE, India) in MEP building services and oil & gas substations: LV/MV panels, cabling, testing' },
  { key: 'icu_nurse', brief: 'ICU staff nurse, 8 years, 4 roles (Saudi, India): critical care, ventilators, ACLS' },
  { key: 'ward_nurse', brief: 'Medical-surgical ward staff nurse, 5 years, 3 roles (Philippines, UAE)' },
  { key: 'accountant', brief: 'Accountant, 7 years, 4 roles (UAE, India): AP/AR, month-end close, VAT, Tally and SAP' },
  { key: 'sales', brief: 'FMCG sales executive, 6 years, 4 roles (UAE, Oman, Pakistan): modern trade, distributors, targets' },
  { key: 'fnb', brief: 'Hotel F&B supervisor, 7 years, 4 roles (Dubai, Doha, Sri Lanka): restaurant and banquet operations' },
  { key: 'developer', brief: 'Software developer, 6 years, 4 roles (Dubai, India): .NET Core, Angular, SQL Server, Azure' },
  { key: 'hr', brief: 'HR officer, 5 years, 3 roles (Saudi, Egypt): recruitment, payroll inputs, onboarding, GOSI/Qiwa admin' },
  { key: 'civil', brief: 'Civil site engineer, 10 years, 5 roles (Saudi, Qatar, India): building and infrastructure, concrete works, BOQ' },
  { key: 'driver', brief: 'Heavy truck / trailer driver, 9 years, 3 roles (UAE, Saudi, Nepal): long-haul, cargo, vehicle checks' },
  { key: 'logistics', brief: 'Logistics and warehouse coordinator, 6 years, 4 roles (Dubai, Jebel Ali, India): inventory, WMS, shipping documents' },
  { key: 'qaqc', brief: 'QA/QC inspector (welding and piping), 10 years, 5 roles (Saudi, Kuwait, India) in oil & gas projects' },
  { key: 'admin', brief: 'Admin assistant / receptionist, 4 years, 3 roles (Abu Dhabi, Philippines): front desk, scheduling, filing, MS Office' },
  { key: 'fresher', brief: 'Fresh mechanical engineering graduate (2025), one 6-month internship at a construction company and one final-year project, India' },
]

export const SCENARIOS: Array<{ id: string; profile: string; title: string; jd: boolean; expect: 'same' | 'related' | 'different' }> = [
  // Same field, with a job advert
  { id: 'mep-senior', profile: 'mep_mech', title: 'Senior MEP Engineer', jd: true, expect: 'same' },
  { id: 'elec-mep', profile: 'electrical', title: 'Electrical Engineer (MEP)', jd: true, expect: 'same' },
  { id: 'icu-icu', profile: 'icu_nurse', title: 'ICU Staff Nurse', jd: true, expect: 'same' },
  { id: 'acc-senior', profile: 'accountant', title: 'Senior Accountant', jd: true, expect: 'same' },
  { id: 'sales-kam', profile: 'sales', title: 'Key Account Manager (FMCG)', jd: true, expect: 'same' },
  { id: 'fnb-manager', profile: 'fnb', title: 'F&B Manager', jd: true, expect: 'same' },
  { id: 'dev-fullstack', profile: 'developer', title: 'Full Stack Developer (.NET)', jd: true, expect: 'same' },
  { id: 'hr-generalist', profile: 'hr', title: 'HR Generalist', jd: true, expect: 'same' },
  { id: 'civil-site', profile: 'civil', title: 'Civil Site Engineer', jd: true, expect: 'same' },
  { id: 'driver-heavy', profile: 'driver', title: 'Heavy Duty Driver', jd: true, expect: 'same' },
  { id: 'log-supervisor', profile: 'logistics', title: 'Logistics Supervisor', jd: true, expect: 'same' },
  { id: 'qaqc-engineer', profile: 'qaqc', title: 'QA/QC Engineer (Piping)', jd: true, expect: 'same' },
  { id: 'admin-office', profile: 'admin', title: 'Office Administrator', jd: true, expect: 'same' },
  { id: 'fresher-get', profile: 'fresher', title: 'Graduate Engineer Trainee (Mechanical)', jd: true, expect: 'same' },
  // Related field
  { id: 'elec-to-mech', profile: 'electrical', title: 'Mechanical Engineer (HVAC)', jd: true, expect: 'related' },
  { id: 'ward-to-icu', profile: 'ward_nurse', title: 'ICU Staff Nurse', jd: true, expect: 'related' },
  { id: 'civil-to-qaqc', profile: 'civil', title: 'QA/QC Inspector (Civil)', jd: true, expect: 'related' },
  { id: 'sales-to-mkt', profile: 'sales', title: 'Marketing Executive', jd: true, expect: 'related' },
  // Different field
  { id: 'elec-to-finance', profile: 'electrical', title: 'Finance Manager', jd: true, expect: 'different' },
  { id: 'nurse-to-hotel', profile: 'icu_nurse', title: 'Hotel Front Office Manager', jd: true, expect: 'different' },
  { id: 'dev-to-civil', profile: 'developer', title: 'Civil Site Engineer', jd: true, expect: 'different' },
  { id: 'driver-to-acc', profile: 'driver', title: 'Accountant', jd: true, expect: 'different' },
  // Title only (no advert)
  { id: 'mep-title', profile: 'mep_mech', title: 'MEP Engineer', jd: false, expect: 'same' },
  { id: 'acc-title', profile: 'accountant', title: 'Accountant', jd: false, expect: 'same' },
  { id: 'icu-title', profile: 'icu_nurse', title: 'ICU Nurse', jd: false, expect: 'same' },
  { id: 'log-title', profile: 'logistics', title: 'Warehouse Supervisor', jd: false, expect: 'same' },
]

const PROFILE_PROMPT = `You write realistic FAKE career profiles for testing a CV tool. Invent the person (name, employers may be real well-known companies). Write it the way real candidates write their CVs: some strong bullets with numbers, some plain duty bullets, some vague ones; varied wording; 3–5 bullets per role; no two roles with the same bullets. Dates as YYYY-MM; the latest role may be current (end_date null).
Return ONLY JSON:
{ "full_name": "", "professional_summary": "2–3 sentences as the candidate would write it",
  "work_experience": [ { "role": "", "company": "", "location": "City, Country", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "highlights": [""] } ],
  "skills": [""], "certifications": [ { "name": "", "issuer": "" } ],
  "education": [ { "degree": "", "field_of_study": "", "institution": "", "end_year": 2015 } ],
  "languages": "" }
Most recent role first. 8–14 skills.`

const JD_PROMPT = `Write ONE realistic job advert, as posted on Bayt, Naukrigulf or LinkedIn by a Gulf employer, for the job title given. Include: a short company intro (invented company), responsibilities (6–9), requirements (education, years, 6–10 specific skills/tools/standards, certifications or licences where the role needs them), a few "preferred" items. 200–350 words. Plain text only.`

async function call(system: string, user: string, json: boolean) {
  const r = await generate({ system, user, maxTokens: 4000, temperature: 0.7, route: 'opt-lab/data', configKey: 'default', openRouter: { reasoningOff: true, preferHosts: FAST_HOSTS } })
  return json ? extractJsonObject(r.text) : r.text.trim()
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const pf = path.join(OUT, 'profiles.json')
  const jf = path.join(OUT, 'jobs.json')
  const profiles: Record<string, unknown> = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {}
  const jobs: Record<string, string> = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {}
  await Promise.all(PROFILE_SPECS.filter((s) => !profiles[s.key]).map(async (s) => {
    profiles[s.key] = await call(PROFILE_PROMPT, `Profile: ${s.brief}`, true)
    console.log('profile', s.key)
  }))
  const titles = [...new Set(SCENARIOS.filter((s) => s.jd).map((s) => s.title))]
  await Promise.all(titles.filter((t) => !jobs[t]).map(async (t) => {
    jobs[t] = (await call(JD_PROMPT, `Job title: ${t}`, false)) as string
    console.log('job', t)
  }))
  fs.writeFileSync(pf, JSON.stringify(profiles, null, 2))
  fs.writeFileSync(jf, JSON.stringify(jobs, null, 2))
  console.log(`profiles ${Object.keys(profiles).length}, jobs ${Object.keys(jobs).length}`)
})()
