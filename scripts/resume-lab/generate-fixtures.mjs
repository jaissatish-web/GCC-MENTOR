/**
 * Resume-parser test set — fake people, real-world messy layouts (2026-10-01).
 *
 *   node scripts/resume-lab/generate-fixtures.mjs [outDir]
 *
 * Writes ~100 CVs (PDF, DOCX, pasted text, scanned PDF) plus the TRUE answer
 * for each, so scripts/resume-lab/eval.ts can score a parser field by field.
 * Every person is invented (seeded, so the set is identical on every run) —
 * no real CV, no real personal data. The layouts copy what breaks parsers in
 * the wild: sidebars, Gulf/Indian "biodata" tables, Europass label columns,
 * contact details in the page header or a text box, dates on their own line,
 * no section headings, long project tables, WhatsApp-pasted text, scans.
 */
import fs from 'node:fs'
import path from 'node:path'
import * as docx from 'docx'
import puppeteer from 'puppeteer-core'

const OUT = path.resolve(process.argv[2] ?? 'tmp/parser-lab/fixtures')
fs.mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------- seeded RNG
let seed = 20261001
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const sample = (a, n) => [...a].sort(() => rnd() - 0.5).slice(0, n)

// ---------------------------------------------------------------- pools
const PEOPLE = [
  ['Mohammed Arshad Khan', 'Indian'], ['Priya Ramesh Nair', 'Indian'], ['Suresh Babu Kollam', 'Indian'],
  ['Anjali Deshmukh', 'Indian'], ['Rajesh Kumar Yadav', 'Indian'], ['Fatima Zahra Siddiqui', 'Indian'],
  ['Abdul Rehman Qureshi', 'Pakistani'], ['Ayesha Malik', 'Pakistani'], ['Imran Ali Butt', 'Pakistani'],
  ['Maria Cristina Santos', 'Filipino'], ['John Paul Dela Cruz', 'Filipino'], ['Jennifer Reyes Bautista', 'Filipino'],
  ['Ahmed Mostafa El-Sayed', 'Egyptian'], ['Omar Khaled Hassan', 'Egyptian'], ['Nour El-Din Farouk', 'Egyptian'],
  ['Bishnu Prasad Sharma', 'Nepali'], ['Ram Bahadur Thapa', 'Nepali'], ['Kasun Perera', 'Sri Lankan'],
  ['Dilini Jayawardena', 'Sri Lankan'], ['Tariq Al-Mansoori', 'Jordanian'], ['Rania Haddad', 'Lebanese'],
  ['Sanjay Venkataraman', 'Indian'], ['Deepa Krishnamurthy', 'Indian'], ['Vikram Singh Rathore', 'Indian'],
  ['Mohammed Faisal Ansari', 'Indian'], ['Shahid Afridi Mughal', 'Pakistani'], ['Grace Ann Mendoza', 'Filipino'],
  ['Karim Benali', 'Moroccan'], ['Joseph Thomas Varghese', 'Indian'], ['Nikhil Prabhakar Joshi', 'Indian'],
]
const DOMAINS = {
  mep: {
    roles: ['Mechanical Engineer', 'Senior MEP Engineer', 'HVAC Site Engineer', 'MEP Supervisor', 'Project Engineer - MEP', 'Electrical Engineer'],
    skills: ['HVAC Design', 'Chilled Water Systems', 'AutoCAD', 'Revit MEP', 'Fire Fighting Systems', 'Plumbing & Drainage', 'Testing & Commissioning', 'BOQ Preparation', 'Primavera P6', 'Value Engineering', 'Load Calculation (HAP)', 'Shop Drawings'],
    certs: [['PMP', 'PMI'], ['OSHA 30 Hours', 'OSHA'], ['Society of Engineers UAE Registration', 'SOE'], ['LEED Green Associate', 'USGBC'], ['NEBOSH IGC', 'NEBOSH']],
    degrees: [['B.E.', 'Mechanical Engineering'], ['B.Tech', 'Electrical Engineering'], ['Diploma', 'Mechanical Engineering']],
    bullets: ['Supervised installation of HVAC ducting and chilled water piping for a 40-storey tower.', 'Prepared method statements, ITPs and as-built drawings.', 'Coordinated with consultants for material and shop drawing approvals.', 'Led testing and commissioning of AHUs, FCUs and pumps.', 'Managed a team of 25 technicians and 3 foremen.'],
  },
  finance: {
    roles: ['Accountant', 'Senior Accountant', 'Finance Executive', 'Accounts Payable Specialist', 'Chief Accountant', 'Audit Associate'],
    skills: ['IFRS', 'VAT Compliance (UAE)', 'SAP FICO', 'Tally ERP', 'Oracle Financials', 'Bank Reconciliation', 'Financial Reporting', 'MS Excel (Advanced)', 'Accounts Payable', 'Payroll Processing', 'Budgeting & Forecasting', 'QuickBooks'],
    certs: [['CMA', 'IMA'], ['ACCA (Part Qualified)', 'ACCA'], ['CPA', 'AICPA'], ['UAE VAT Certification', 'FTA'], ['SAP FICO Certified', 'SAP']],
    degrees: [['B.Com', 'Accounting'], ['MBA', 'Finance'], ['M.Com', 'Commerce'], ['BBA', 'Accounting']],
    bullets: ['Prepared monthly financial statements under IFRS.', 'Handled VAT returns and FTA compliance for 3 entities.', 'Reduced month-end closing time from 10 to 6 days.', 'Managed accounts payable for 400+ vendors.', 'Performed bank reconciliations for 12 accounts.'],
  },
  nursing: {
    roles: ['Staff Nurse', 'Registered Nurse', 'ICU Nurse', 'Charge Nurse', 'ER Nurse'],
    skills: ['Patient Assessment', 'BLS', 'ACLS', 'IV Cannulation', 'Wound Care', 'Ventilator Management', 'Electronic Medical Records', 'Infection Control', 'Medication Administration', 'Critical Care'],
    certs: [['DHA License', 'Dubai Health Authority'], ['DOH License', 'Department of Health Abu Dhabi'], ['BLS Provider', 'American Heart Association'], ['ACLS Provider', 'American Heart Association'], ['Prometric Passed - Saudi', 'SCFHS']],
    degrees: [['B.Sc', 'Nursing'], ['GNM', 'General Nursing and Midwifery'], ['BSN', 'Nursing']],
    bullets: ['Provided care for 6–8 patients per shift in a 30-bed medical ward.', 'Administered medications and IV therapy as per protocol.', 'Assisted physicians during emergency procedures.', 'Trained 10 new nurses on unit protocols.', 'Maintained accurate patient records in Cerner EMR.'],
  },
  it: {
    roles: ['Software Engineer', 'Senior .NET Developer', 'IT Support Engineer', 'Network Administrator', 'Full Stack Developer', 'System Administrator'],
    skills: ['C#', '.NET Core', 'SQL Server', 'Angular', 'React', 'Azure', 'Docker', 'Linux', 'Cisco Networking', 'Active Directory', 'Python', 'REST APIs', 'Git'],
    certs: [['CCNA', 'Cisco'], ['Azure Fundamentals AZ-900', 'Microsoft'], ['AWS Certified Solutions Architect', 'Amazon'], ['ITIL Foundation', 'Axelos'], ['MCSA', 'Microsoft']],
    degrees: [['B.Tech', 'Computer Science'], ['MCA', 'Computer Applications'], ['B.Sc', 'Information Technology'], ['BCA', 'Computer Applications']],
    bullets: ['Developed REST APIs in .NET Core serving 50,000 daily users.', 'Migrated on-premise servers to Azure, cutting hosting cost by 30%.', 'Managed Active Directory for 800 users.', 'Resolved L2 support tickets within SLA.', 'Built Angular dashboards for management reporting.'],
  },
  hospitality: {
    roles: ['Front Office Executive', 'Guest Relations Officer', 'F&B Supervisor', 'Restaurant Manager', 'Housekeeping Supervisor', 'Commis Chef'],
    skills: ['Opera PMS', 'Guest Relations', 'Upselling', 'Complaint Handling', 'Micros POS', 'Food Safety (HACCP)', 'Team Leadership', 'Banquet Operations', 'Inventory Control', 'Arabic (Basic)'],
    certs: [['HACCP Level 3', 'Highfield'], ['Person in Charge (PIC)', 'Dubai Municipality'], ['Opera PMS Certified', 'Oracle'], ['Food Safety Level 2', 'Highfield']],
    degrees: [['BHM', 'Hotel Management'], ['Diploma', 'Hospitality Management'], ['B.Sc', 'Hospitality and Hotel Administration']],
    bullets: ['Handled check-in and check-out for a 350-room 5-star hotel.', 'Achieved 92% guest satisfaction score on TrustYou.', 'Supervised a team of 12 waiters across two outlets.', 'Managed banquet events for up to 500 guests.', 'Trained staff on HACCP standards.'],
  },
  sales: {
    roles: ['Sales Executive', 'Business Development Manager', 'Key Account Manager', 'Area Sales Manager', 'Retail Store Manager'],
    skills: ['B2B Sales', 'CRM (Salesforce)', 'Negotiation', 'Key Account Management', 'Market Analysis', 'Team Management', 'Lead Generation', 'Merchandising', 'Distributor Management'],
    certs: [['Certified Sales Professional', 'NASP'], ['Salesforce Administrator', 'Salesforce'], ['Digital Marketing', 'Google']],
    degrees: [['MBA', 'Marketing'], ['BBA', 'Marketing'], ['B.A.', 'Economics']],
    bullets: ['Achieved 125% of annual sales target (AED 8.5M).', 'Opened 40 new retail accounts across the Northern Emirates.', 'Managed key accounts including Carrefour and Lulu.', 'Led a team of 8 sales executives.', 'Negotiated annual contracts with 15 distributors.'],
  },
}
const GULF = [['Dubai, UAE', 'UAE'], ['Abu Dhabi, UAE', 'UAE'], ['Sharjah, UAE', 'UAE'], ['Riyadh, Saudi Arabia', 'KSA'], ['Jeddah, KSA', 'KSA'], ['Doha, Qatar', 'Qatar'], ['Muscat, Oman', 'Oman'], ['Kuwait City, Kuwait', 'Kuwait'], ['Manama, Bahrain', 'Bahrain']]
const HOME = { Indian: ['Mumbai, India', 'Chennai, India', 'Kochi, Kerala', 'Hyderabad, India', 'Pune, Maharashtra', 'New Delhi, India'], Pakistani: ['Karachi, Pakistan', 'Lahore, Pakistan'], Filipino: ['Manila, Philippines', 'Cebu City, Philippines'], Egyptian: ['Cairo, Egypt', 'Alexandria, Egypt'], Nepali: ['Kathmandu, Nepal'], 'Sri Lankan': ['Colombo, Sri Lanka'], Jordanian: ['Amman, Jordan'], Lebanese: ['Beirut, Lebanon'], Moroccan: ['Casablanca, Morocco'] }
const COMPANIES_GULF = ['Al Futtaim Group', 'Emaar Properties', 'Arabtec Construction LLC', 'Al Naboodah Contracting', 'Majid Al Futtaim', 'Saudi Binladin Group', 'Al Jaber Engineering', 'Drake & Scull International', 'Aster DM Healthcare', 'NMC Healthcare', 'Rotana Hotels', 'Jumeirah Group', 'Lulu Hypermarket', 'Emirates NBD', 'Al Habtoor Group', 'Etisalat', 'Qatar Airways', 'Almarai Company', 'Dubai Holding', 'ENOC']
const COMPANIES_HOME = ['Larsen & Toubro Ltd', 'Tata Consultancy Services', 'Infosys Ltd', 'Apollo Hospitals', 'Voltas Limited', 'Taj Hotels', 'HDFC Bank', 'Wipro Technologies', 'Fortis Healthcare', 'Reliance Retail', 'Engro Corporation', 'SM Supermalls', 'Orascom Construction', 'Nepal Telecom', 'John Keells Holdings', 'Shapoorji Pallonji']
const INSTITUTES = { Indian: ['University of Mumbai', 'Anna University', 'University of Kerala', 'Osmania University', 'Savitribai Phule Pune University', 'Delhi University'], Pakistani: ['University of Karachi', 'NED University', 'University of the Punjab'], Filipino: ['University of Santo Tomas', 'Cebu Doctors University'], Egyptian: ['Cairo University', 'Ain Shams University'], Nepali: ['Tribhuvan University'], 'Sri Lankan': ['University of Colombo'], Jordanian: ['University of Jordan'], Lebanese: ['Lebanese University'], Moroccan: ['Hassan II University'] }
const VISAS = ['Employment Visa', 'Visit Visa', 'Residence Visa (Transferable)', 'Golden Visa', 'Husband Sponsorship', 'Cancelled - Available Immediately']
const NOTICE = ['Immediate', '1 Month', '30 days', '2 Months', '15 days', '60 days']

// ---------------------------------------------------------------- dates
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DATE_STYLES = ['Mon YYYY', 'MM/YYYY', "Mon'YY", 'Month, YYYY', 'YYYY-MM', "Mon'YYYY", 'MM.YYYY', 'YYYY']
const PRESENT = ['Present', 'Till Date', 'Current', 'To Date', 'Now', 'Till date']
function fmt(d, style) {
  if (!d) return null
  const mm = String(d.m).padStart(2, '0')
  switch (style) {
    case 'Mon YYYY': return `${MON[d.m - 1]} ${d.y}`
    case 'MM/YYYY': return `${mm}/${d.y}`
    case "Mon'YY": return `${MON[d.m - 1]}'${String(d.y).slice(2)}`
    case 'Month, YYYY': return `${MONTH[d.m - 1]}, ${d.y}`
    case 'YYYY-MM': return `${d.y}-${mm}`
    case "Mon'YYYY": return `${MON[d.m - 1]}'${d.y}`
    case 'MM.YYYY': return `${mm}.${d.y}`
    case 'YYYY': return `${d.y}`
  }
}
const truthDate = (d, style) => (d ? (style === 'YYYY' ? `${d.y}` : `${d.y}-${String(d.m).padStart(2, '0')}`) : null)

// ---------------------------------------------------------------- person
let personCounter = 0
function makePerson({ fresher = false, long = false } = {}) {
  const [name, nationality] = PEOPLE[personCounter++ % PEOPLE.length]
  const domainKey = pick(Object.keys(DOMAINS))
  const D = DOMAINS[domainKey]
  const first = name.split(' ')[0].toLowerCase()
  const last = name.split(' ').slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')
  const inGulf = rnd() < 0.7
  const gulfLoc = pick(GULF)
  const home = pick(HOME[nationality])
  const dateStyle = pick(DATE_STYLES)
  const present = pick(PRESENT)
  const birthYear = fresher ? int(1999, 2002) : int(1978, 1995)
  const gradYear = birthYear + int(21, 23)

  const jobs = []
  if (!fresher) {
    const n = long ? int(5, 7) : int(2, 4)
    let end = null // current job first
    let cursor = { y: 2026, m: int(1, 8) }
    for (let i = 0; i < n; i++) {
      const years = int(1, 4)
      const start = { y: cursor.y - years, m: int(1, 12) }
      if (start.y < gradYear) start.y = gradYear
      const gulf = i < 2 ? inGulf || rnd() < 0.4 : rnd() < 0.3
      const loc = gulf ? pick(GULF)[0] : pick(HOME[nationality])
      jobs.push({
        company: gulf ? pick(COMPANIES_GULF) : pick(COMPANIES_HOME),
        role: pick(D.roles),
        start, end, location: loc,
        bullets: sample(D.bullets, long ? 4 : int(2, 3)),
      })
      end = { y: start.y, m: Math.max(1, start.m - int(0, 2)) }
      cursor = end
      if (cursor.y <= gradYear) break
    }
    // unique companies (two identical companies make scoring ambiguous)
    const seen = new Set()
    for (const j of jobs) {
      while (seen.has(j.company)) j.company = pick([...COMPANIES_GULF, ...COMPANIES_HOME])
      seen.add(j.company)
    }
  }
  const [deg, field] = pick(D.degrees)
  const education = [{ degree: deg, field, institution: pick(INSTITUTES[nationality]), start_year: gradYear - (deg === 'MBA' || deg === 'M.Com' || deg === 'MCA' ? 2 : 4), end_year: gradYear }]
  if (rnd() < 0.5) education.push({ degree: pick(['Higher Secondary (12th)', 'HSC', 'Intermediate (FSc)', 'Senior High School']), field: pick(['Science', 'Commerce']), institution: pick(['State Board', 'CBSE', 'Federal Board', 'DepEd']), start_year: null, end_year: gradYear - 4 })
  const p = {
    full_name: name,
    nationality,
    email: `${first}.${last}${int(10, 99)}@${pick(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'])}`,
    phone: inGulf ? `+971 5${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}` : pick([`+91 ${int(70000, 99999)} ${int(10000, 99999)}`, `+92 3${int(0, 4)}${int(0, 9)} ${int(1000000, 9999999)}`, `+63 9${int(10, 99)} ${int(100, 999)} ${int(1000, 9999)}`]),
    dob: { y: birthYear, m: int(1, 12), d: int(1, 28) },
    location: inGulf ? gulfLoc[0] : home,
    linkedin: rnd() < 0.6 ? `linkedin.com/in/${first}-${last}-${int(100, 999)}` : null,
    passport_type: nationality === 'Indian' && rnd() < 0.7 ? pick(['ECR', 'Non-ECR']) : null,
    visa_status: inGulf && rnd() < 0.7 ? pick(VISAS) : null,
    notice: rnd() < 0.6 ? pick(NOTICE) : null,
    summary: fresher
      ? `Motivated ${field} graduate seeking an entry-level opportunity in the GCC.`
      : `${pick(D.roles)} with ${2026 - (jobs.at(-1)?.start.y ?? 2020)}+ years of experience across ${inGulf ? 'the GCC and ' : ''}${nationality === 'Indian' ? 'India' : 'home country'}. Strong in ${D.skills.slice(0, 3).join(', ')}.`,
    jobs,
    education,
    skills: sample(D.skills, int(6, 10)),
    certs: sample(D.certs, int(0, 3)).map(([n, iss]) => ({ name: n, issuer: iss, year: int(2015, 2024) })),
    languages: sample(['English', 'Hindi', 'Malayalam', 'Urdu', 'Arabic', 'Tagalog', 'Tamil', 'Nepali'], int(2, 3)),
    dateStyle, present, domainKey,
    internships: fresher ? [{ company: pick(COMPANIES_HOME), role: `${pick(D.roles)} Intern`, start: { y: gradYear, m: 1 }, end: { y: gradYear, m: 6 }, location: home, bullets: sample(D.bullets, 2) }] : [],
  }
  if (fresher) p.jobs = p.internships
  return p
}

const D_ = (p, d) => fmt(d, p.dateStyle)
const range = (p, j) => `${D_(p, j.start)} ${pick(['–', '-', 'to', '—'])} ${j.end ? D_(p, j.end) : p.present}`
const dobText = (p) => pick([`${String(p.dob.d).padStart(2, '0')}/${String(p.dob.m).padStart(2, '0')}/${p.dob.y}`, `${p.dob.d} ${MONTH[p.dob.m - 1]} ${p.dob.y}`, `${String(p.dob.d).padStart(2, '0')}-${MON[p.dob.m - 1]}-${p.dob.y}`])

function truth(p) {
  return {
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    nationality: p.nationality,
    date_of_birth: `${p.dob.y}-${String(p.dob.m).padStart(2, '0')}-${String(p.dob.d).padStart(2, '0')}`,
    passport_type: p.passport_type,
    visa_status: p.visa_status,
    notice_period: p.notice,
    current_location: p.location,
    linkedin_url: p.linkedin,
    work_experience: p.jobs.map((j) => ({ company: j.company, role: j.role, start_date: truthDate(j.start, p.dateStyle), end_date: truthDate(j.end, p.dateStyle), location: j.location })),
    education: p.education.map((e) => ({ degree: e.degree, institution: e.institution, end_year: e.end_year })),
    skills: p.skills,
    certifications: p.certs.map((c) => c.name),
  }
}

// ---------------------------------------------------------------- HTML layouts (PDF)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const BASE_CSS = `body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#222;margin:0} h1{font-size:20pt;margin:0} h2{font-size:11.5pt;text-transform:uppercase;border-bottom:1px solid #999;margin:12px 0 4px} ul{margin:2px 0 6px 18px;padding:0} table{border-collapse:collapse;width:100%} td,th{vertical-align:top;padding:3px 5px;text-align:left}`
const contactBits = (p, icons) => [
  `${icons ? '☎ ' : 'Mobile: '}${p.phone}`, `${icons ? '✉ ' : 'Email: '}${p.email}`, p.linkedin && `${icons ? '🔗 ' : 'LinkedIn: '}${p.linkedin}`, `${icons ? '📍 ' : 'Location: '}${p.location}`,
].filter(Boolean)
const personalRows = (p) => [
  ['Nationality', p.nationality], ['Date of Birth', dobText(p)], p.passport_type && ['Passport Type', p.passport_type],
  p.visa_status && ['Visa Status', p.visa_status], p.notice && ['Notice Period', p.notice], ['Languages', p.languages.join(', ')],
].filter(Boolean)
const jobBlockHtml = (p, j) => `<p><b>${esc(j.role)}</b> — ${esc(j.company)}, ${esc(j.location)}<br><i>${esc(range(p, j))}</i></p><ul>${j.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`

const HTML = {
  classic: (p) => `<style>${BASE_CSS} body{padding:36px 48px}</style><h1>${esc(p.full_name)}</h1><div>${contactBits(p).map(esc).join(' | ')}</div>
    <h2>Professional Summary</h2><p>${esc(p.summary)}</p><h2>${p.internships.length ? 'Internship' : 'Work Experience'}</h2>${p.jobs.map((j) => jobBlockHtml(p, j)).join('')}
    <h2>Education</h2>${p.education.map((e) => `<p><b>${esc(e.degree)}${e.field ? ' in ' + esc(e.field) : ''}</b>, ${esc(e.institution)} — ${e.end_year}</p>`).join('')}
    <h2>Skills</h2><p>${p.skills.map(esc).join(', ')}</p>${p.certs.length ? `<h2>Certifications</h2><ul>${p.certs.map((c) => `<li>${esc(c.name)} – ${esc(c.issuer)} (${c.year})</li>`).join('')}</ul>` : ''}
    <h2>Personal Details</h2>${personalRows(p).map(([k, v]) => `<div>${k}: ${esc(v)}</div>`).join('')}`,

  sidebar: (p) => `<style>${BASE_CSS} .wrap{display:flex;min-height:100vh} .side{width:32%;background:#1f3a5f;color:#fff;padding:28px 18px} .side h2{border-color:#8fb} .main{width:68%;padding:28px 26px}</style>
    <div class="wrap"><div class="side"><h1 style="font-size:17pt">${esc(p.full_name)}</h1><p>${esc(p.jobs[0]?.role ?? 'Graduate')}</p>
    <h2>Contact</h2>${contactBits(p, true).map((c) => `<div>${esc(c)}</div>`).join('')}
    <h2>Skills</h2>${p.skills.map((s) => `<div>▪ ${esc(s)}</div>`).join('')}<h2>Languages</h2><div>${p.languages.join(' • ')}</div>
    <h2>Education</h2>${p.education.map((e) => `<p><b>${esc(e.degree)}</b><br>${esc(e.institution)}<br>${e.start_year ?? ''}${e.start_year ? ' - ' : ''}${e.end_year}</p>`).join('')}
    <h2>Personal</h2>${personalRows(p).filter(([k]) => k !== 'Languages').map(([k, v]) => `<div>${k}: ${esc(v)}</div>`).join('')}</div>
    <div class="main"><h2>Profile</h2><p>${esc(p.summary)}</p><h2>Experience</h2>${p.jobs.map((j) => jobBlockHtml(p, j)).join('')}
    ${p.certs.length ? `<h2>Certifications</h2>${p.certs.map((c) => `<div>● ${esc(c.name)}, ${esc(c.issuer)}, ${c.year}</div>`).join('')}` : ''}</div></div>`,

  biodata: (p) => `<style>${BASE_CSS} body{padding:30px 40px} td,th{border:1px solid #555}</style><h1 style="text-align:center">CURRICULUM VITAE</h1><p style="text-align:center"><b>${esc(p.full_name.toUpperCase())}</b><br>${contactBits(p).map(esc).join('<br>')}</p>
    <h2>Career Objective</h2><p>${esc(p.summary)}</p><h2>Personal Details</h2><table>${personalRows(p).map(([k, v]) => `<tr><td style="width:35%">${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <h2>Employment History</h2><table><tr><th>S.No</th><th>Company Name</th><th>Designation</th><th>Duration</th><th>Location</th></tr>${p.jobs.map((j, i) => `<tr><td>${i + 1}</td><td>${esc(j.company)}</td><td>${esc(j.role)}</td><td>${esc(range(p, j))}</td><td>${esc(j.location)}</td></tr>`).join('')}</table>
    <h2>Job Responsibilities</h2><ul>${p.jobs[0].bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    <h2>Educational Qualification</h2><table><tr><th>Qualification</th><th>Board / University</th><th>Year of Passing</th></tr>${p.education.map((e) => `<tr><td>${esc(e.degree)}${e.field ? ' (' + esc(e.field) + ')' : ''}</td><td>${esc(e.institution)}</td><td>${e.end_year}</td></tr>`).join('')}</table>
    <h2>Technical Skills</h2><table>${chunk(p.skills, 3).map((r) => `<tr>${r.map((s) => `<td>${esc(s)}</td>`).join('')}</tr>`).join('')}</table>
    ${p.certs.length ? `<h2>Certifications</h2><ul>${p.certs.map((c) => `<li>${esc(c.name)} (${esc(c.issuer)}) - ${c.year}</li>`).join('')}</ul>` : ''}
    <h2>Declaration</h2><p>I hereby declare that the above information is true to the best of my knowledge.</p><p>Place: ${esc(p.location.split(',')[0])}<span style="float:right">(${esc(p.full_name)})</span></p>`,

  europass: (p) => `<style>${BASE_CSS} body{padding:30px 36px} td.l{width:28%;color:#1a4f8a;text-align:right;padding-right:14px;font-size:9.5pt} td.r{border-left:2px solid #1a4f8a}</style>
    <table><tr><td class="l">PERSONAL INFORMATION</td><td class="r"><h1 style="font-size:16pt">${esc(p.full_name)}</h1>${contactBits(p).map((c) => `<div>${esc(c)}</div>`).join('')}<div>Date of birth ${esc(dobText(p))} | Nationality ${esc(p.nationality)}</div></td></tr>
    <tr><td class="l">WORK EXPERIENCE</td><td class="r"></td></tr>${p.jobs.map((j) => `<tr><td class="l">${esc(range(p, j))}</td><td class="r"><b>${esc(j.role)}</b><br>${esc(j.company)}, ${esc(j.location)}<ul>${j.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></td></tr>`).join('')}
    <tr><td class="l">EDUCATION AND TRAINING</td><td class="r"></td></tr>${p.education.map((e) => `<tr><td class="l">${e.start_year ? e.start_year + '–' : ''}${e.end_year}</td><td class="r"><b>${esc(e.degree)}${e.field ? ' in ' + esc(e.field) : ''}</b><br>${esc(e.institution)}</td></tr>`).join('')}
    <tr><td class="l">PERSONAL SKILLS</td><td class="r">Mother tongue(s): ${esc(p.languages[0])}<br>Other language(s): ${esc(p.languages.slice(1).join(', '))}<br>Job-related skills: ${p.skills.map(esc).join(', ')}</td></tr>
    ${p.certs.length ? `<tr><td class="l">CERTIFICATES</td><td class="r">${p.certs.map((c) => esc(c.name) + ' (' + c.year + ')').join('<br>')}</td></tr>` : ''}
    ${p.visa_status || p.notice ? `<tr><td class="l">ADDITIONAL INFORMATION</td><td class="r">${p.visa_status ? 'Visa: ' + esc(p.visa_status) + '<br>' : ''}${p.notice ? 'Notice period: ' + esc(p.notice) + '<br>' : ''}${p.passport_type ? 'Passport: ' + p.passport_type : ''}</td></tr>` : ''}</table>`,

  timeline: (p) => `<style>${BASE_CSS} body{padding:34px 46px} .d{color:#777;font-size:9pt;margin-top:10px}</style><h1>${esc(p.full_name.toUpperCase())}</h1><div style="color:#555">${esc(p.jobs[0]?.role ?? '')}</div>
    <div style="margin:6px 0">${contactBits(p, true).map(esc).join('&nbsp;&nbsp;&nbsp;')}</div><p>${esc(p.summary)}</p><h2>Experience</h2>
    ${p.jobs.map((j) => `<div class="d">${esc(D_(p, j.start))} — ${esc(j.end ? D_(p, j.end) : p.present)}</div><div><b>${esc(j.company.toUpperCase())}</b></div><div>${esc(j.location)}</div><div><i>${esc(j.role)}</i></div><ul>${j.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`).join('')}
    <h2>Education</h2>${p.education.map((e) => `<div class="d">${e.end_year}</div><div><b>${esc(e.institution)}</b></div><div>${esc(e.degree)}${e.field ? ', ' + esc(e.field) : ''}</div>`).join('')}
    <h2>Skills</h2><p>${p.skills.map(esc).join(' · ')}</p>${p.certs.length ? `<h2>Certificates</h2><p>${p.certs.map((c) => esc(c.name)).join(' · ')}</p>` : ''}
    <h2>Details</h2>${personalRows(p).map(([k, v]) => `<span>${k}: ${esc(v)}</span>`).join(' | ')}`,

  noheadings: (p) => `<style>${BASE_CSS} body{padding:30px 44px;font-size:10pt}</style><div><b style="font-size:15pt">${esc(p.full_name)}</b> ${esc(p.phone)} ${esc(p.email)} ${esc(p.location)} ${p.linkedin ? esc(p.linkedin) : ''}</div>
    ${p.education.map((e) => `<p>${esc(e.degree)} ${e.field ? esc(e.field) : ''}, ${esc(e.institution)}, ${e.end_year}</p>`).join('')}
    ${p.jobs.map((j) => `<p><b>${esc(j.company)}</b> ${esc(j.location)} ${esc(range(p, j))}<br>${esc(j.role)}. ${j.bullets.map(esc).join(' ')}</p>`).join('')}
    <p>${p.skills.map(esc).join(', ')}${p.certs.length ? '. ' + p.certs.map((c) => esc(c.name)).join(', ') : ''}</p><p>${personalRows(p).map(([k, v]) => `${k} ${esc(v)}`).join('; ')}</p>`,

  // Two columns drawn ROW BY ROW (left item, right item, left item…) — the order
  // design tools often write a PDF in. Text extractors then interleave the
  // sidebar with the main column line by line: the classic real-world failure.
  grid: (p) => {
    const left = [p.full_name, p.jobs[0]?.role ?? 'Graduate', 'CONTACT', ...contactBits(p, true), 'SKILLS', ...p.skills, 'LANGUAGES', p.languages.join(', '), 'EDUCATION', ...p.education.flatMap((e) => [e.degree + (e.field ? ' - ' + e.field : ''), e.institution, String(e.end_year)]), 'PERSONAL', ...personalRows(p).filter(([k]) => k !== 'Languages').map(([k, v]) => k + ': ' + v)]
    const right = ['PROFILE', p.summary, 'WORK EXPERIENCE', ...p.jobs.flatMap((j) => [j.role, j.company + ' | ' + j.location, range(p, j), ...j.bullets.map((b) => '• ' + b)]), ...(p.certs.length ? ['CERTIFICATIONS', ...p.certs.map((c) => c.name + ' - ' + c.year)] : [])]
    const rows = Math.max(left.length, right.length)
    return `<style>${BASE_CSS} body{padding:24px} .g{display:grid;grid-template-columns:30% 70%;column-gap:18px;row-gap:2px} .l{color:#123} .r{}</style><div class="g">${Array.from({ length: rows }, (_, i) => `<div class="l">${esc(left[i] ?? '')}</div><div class="r">${esc(right[i] ?? '')}</div>`).join('')}</div>`
  },

  long: (p) => `<style>${BASE_CSS} body{padding:30px 40px} td,th{border:1px solid #888;font-size:9.5pt}</style>` + HTML.classic(p).replace(/<h2>Education<\/h2>/, `<h2>Major Projects Handled</h2><table><tr><th>Project</th><th>Client</th><th>Value</th><th>Role</th><th>Year</th></tr>${Array.from({ length: 12 }, (_, i) => `<tr><td>${pick(['Tower', 'Mall', 'Hospital', 'Villa Complex', 'Metro Station', 'Hotel'])} Project ${i + 1}</td><td>${pick(['Emaar', 'Nakheel', 'Aldar', 'RTA', 'Meraas', 'ROSHN'])}</td><td>AED ${int(20, 900)}M</td><td>${pick(['Lead', 'Site', 'Design Review', 'T&C'])}</td><td>${int(2014, 2025)}</td></tr>`).join('')}</table><h2>Education</h2>`),
}
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// ---------------------------------------------------------------- DOCX layouts
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer, Textbox, HeadingLevel } = docx
const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size })], heading: opts.heading, bullet: opts.bullet ? { level: 0 } : undefined })
const H = (t) => P(t.toUpperCase(), { bold: true, size: 24 })
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE }
const cell = (children, w) => new TableCell({ children: (Array.isArray(children) ? children : [children]).map((c) => (typeof c === 'string' ? P(c) : c)), width: w ? { size: w, type: WidthType.PERCENTAGE } : undefined })
const tbl = (rows, borders) => new Table({ rows: rows.map((r) => new TableRow({ children: r })), width: { size: 100, type: WidthType.PERCENTAGE }, borders })
const jobsDocx = (p) => p.jobs.flatMap((j) => [P(`${j.role} — ${j.company}, ${j.location}`, { bold: true }), P(range(p, j), { italic: true }), ...j.bullets.map((b) => P(b, { bullet: true }))])
const eduDocx = (p) => p.education.map((e) => P(`${e.degree}${e.field ? ' in ' + e.field : ''}, ${e.institution} — ${e.end_year}`))
const certDocx = (p) => (p.certs.length ? [H('Certifications'), ...p.certs.map((c) => P(`${c.name} – ${c.issuer} (${c.year})`, { bullet: true }))] : [])
const personalDocx = (p) => personalRows(p).map(([k, v]) => P(`${k}: ${v}`))

const DOCX = {
  classic: (p) => ({ children: [P(p.full_name, { bold: true, size: 36 }), P(contactBits(p).join(' | ')), H('Professional Summary'), P(p.summary), H(p.internships.length ? 'Internship' : 'Work Experience'), ...jobsDocx(p), H('Education'), ...eduDocx(p), H('Skills'), P(p.skills.join(', ')), ...certDocx(p), H('Personal Details'), ...personalDocx(p)] }),
  sidebar: (p) => ({ children: [tbl([[
    cell([P(p.full_name, { bold: true, size: 30 }), P(p.jobs[0]?.role ?? 'Graduate'), H('Contact'), ...contactBits(p, true).map((c) => P(c)), H('Skills'), ...p.skills.map((s) => P('▪ ' + s)), H('Languages'), P(p.languages.join(', ')), H('Education'), ...p.education.flatMap((e) => [P(e.degree, { bold: true }), P(e.institution), P(String(e.end_year))]), H('Personal'), ...personalDocx(p).slice(0, -1)], 33),
    cell([H('Profile'), P(p.summary), H('Experience'), ...jobsDocx(p), ...certDocx(p)], 67),
  ]], NOB)] }),
  biodata: (p) => ({ children: [P('CURRICULUM VITAE', { bold: true, size: 32 }), P(p.full_name.toUpperCase(), { bold: true }), ...contactBits(p).map((c) => P(c)), H('Career Objective'), P(p.summary), H('Personal Details'),
    tbl(personalRows(p).map(([k, v]) => [cell(k, 35), cell(v, 65)])), H('Employment History'),
    tbl([[cell('S.No'), cell('Company Name'), cell('Designation'), cell('Duration'), cell('Location')], ...p.jobs.map((j, i) => [cell(String(i + 1)), cell(j.company), cell(j.role), cell(range(p, j)), cell(j.location)])]),
    H('Job Responsibilities'), ...p.jobs[0].bullets.map((b) => P(b, { bullet: true })), H('Educational Qualification'),
    tbl([[cell('Qualification'), cell('Board / University'), cell('Year of Passing')], ...p.education.map((e) => [cell(e.degree + (e.field ? ` (${e.field})` : '')), cell(e.institution), cell(String(e.end_year))])]),
    H('Technical Skills'), tbl(chunk(p.skills, 3).map((r) => [...r.map((s) => cell(s)), ...Array(3 - r.length).fill(0).map(() => cell(''))])), ...certDocx(p),
    H('Declaration'), P('I hereby declare that the above information is true to the best of my knowledge.'), P(`Place: ${p.location.split(',')[0]}\t\t\t(${p.full_name})`)] }),
  europass: (p) => ({ children: [tbl([
    [cell('PERSONAL INFORMATION', 28), cell([P(p.full_name, { bold: true, size: 30 }), ...contactBits(p).map((c) => P(c)), P(`Date of birth ${dobText(p)} | Nationality ${p.nationality}`)], 72)],
    [cell('WORK EXPERIENCE'), cell('')], ...p.jobs.map((j) => [cell(range(p, j)), cell([P(j.role, { bold: true }), P(`${j.company}, ${j.location}`), ...j.bullets.map((b) => P(b, { bullet: true }))])]),
    [cell('EDUCATION AND TRAINING'), cell('')], ...p.education.map((e) => [cell(`${e.start_year ? e.start_year + '–' : ''}${e.end_year}`), cell([P(e.degree + (e.field ? ' in ' + e.field : ''), { bold: true }), P(e.institution)])]),
    [cell('PERSONAL SKILLS'), cell([P(`Mother tongue(s): ${p.languages[0]}`), P(`Job-related skills: ${p.skills.join(', ')}`)])],
    ...(p.certs.length ? [[cell('CERTIFICATES'), cell(p.certs.map((c) => P(`${c.name} (${c.year})`)))]] : []),
    ...(p.visa_status || p.notice ? [[cell('ADDITIONAL INFORMATION'), cell([p.visa_status && P('Visa: ' + p.visa_status), p.notice && P('Notice period: ' + p.notice), p.passport_type && P('Passport: ' + p.passport_type)].filter(Boolean))]] : []),
  ], NOB)] }),
  header: (p) => ({
    headers: { default: new Header({ children: [P(p.full_name, { bold: true, size: 32 }), P(contactBits(p).join('  |  '))] }) },
    footers: { default: new Footer({ children: [P(`${p.full_name} — Curriculum Vitae`)] }) },
    children: [H('Summary'), P(p.summary), H('Experience'), ...jobsDocx(p), H('Education'), ...eduDocx(p), H('Key Skills'), P(p.skills.join(' | ')), ...certDocx(p), H('Personal Information'), ...personalDocx(p)],
  }),
  textbox: (p) => ({ children: [
    new Paragraph({ children: [new Textbox({ alignment: 'left', style: { width: '200pt', height: '90pt' }, children: [P(p.full_name, { bold: true, size: 32 }), ...contactBits(p).map((c) => P(c))] })] }),
    H('Objective'), P(p.summary), H('Professional Experience'), ...jobsDocx(p), H('Academic Qualification'), ...eduDocx(p), H('Skills'), ...p.skills.map((s) => P(s, { bullet: true })), ...certDocx(p), H('Personal Profile'), ...personalDocx(p),
  ] }),
  long: (p) => ({ children: [...DOCX.classic(p).children.slice(0, -personalRows(p).length - 1), H('Major Projects'), tbl([[cell('Project'), cell('Client'), cell('Value'), cell('Year')], ...Array.from({ length: 12 }, (_, i) => [cell(`Project ${i + 1} - ${pick(['Tower', 'Mall', 'Hospital', 'Metro'])}`), cell(pick(['Emaar', 'Nakheel', 'Aldar', 'RTA'])), cell(`AED ${int(20, 900)}M`), cell(String(int(2014, 2025)))])]), H('Personal Details'), ...personalDocx(p)] }),
}

// ---------------------------------------------------------------- pasted text
function pasted(p) {
  const nl = () => pick(['\n', '\n\n', '\n'])
  return [
    `${pick(['', '*'])}${p.full_name}${pick(['', '*'])}`, `📱 ${p.phone}`, `📧 ${p.email}`, `📍${p.location}`, p.linkedin ? `in/ ${p.linkedin}` : '', '',
    pick(['ABOUT ME', 'Summary:', '*Profile*']), p.summary, '',
    pick(['EXPERIENCE', 'Work history:', '*Experience*']),
    ...p.jobs.map((j) => `${pick(['👉 ', '- ', '• ', ''])}${j.role} at ${j.company} (${j.location}) ${range(p, j)}${nl()}${j.bullets.map((b) => '  ' + b).join('\n')}`),
    '', pick(['EDUCATION', 'Education:']), ...p.education.map((e) => `${e.degree} ${e.field ?? ''} - ${e.institution} - ${e.end_year}`),
    '', `Skills: ${p.skills.join(', ')}`, p.certs.length ? `Certificates: ${p.certs.map((c) => c.name).join(', ')}` : '',
    personalRows(p).map(([k, v]) => `${k}: ${v}`).join('\n'),
  ].join('\n').replace(/  +/g, () => pick([' ', '  ', '   ']))
}

// ---------------------------------------------------------------- build
const PLAN = [
  // [layout, format, count, personOpts]
  ['classic', 'pdf', 6], ['classic', 'docx', 6], ['sidebar', 'pdf', 8], ['sidebar', 'docx', 6],
  ['biodata', 'pdf', 8], ['biodata', 'docx', 8], ['europass', 'pdf', 5], ['europass', 'docx', 4],
  ['timeline', 'pdf', 6], ['grid', 'pdf', 8], ['noheadings', 'pdf', 5], ['header', 'docx', 6], ['textbox', 'docx', 5],
  ['long', 'pdf', 4, { long: true }], ['long', 'docx', 3, { long: true }], ['classic', 'pdf', 3, { fresher: true }],
  ['sidebar', 'pdf', 2, { fresher: true }], ['pasted', 'txt', 8], ['scanned', 'pdf', 3],
]

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => fs.existsSync(c))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
const manifest = []
let n = 0
for (const [layout, format, count, opts] of PLAN) {
  for (let i = 0; i < count; i++) {
    const p = makePerson(opts)
    const id = `${String(++n).padStart(3, '0')}-${layout}${opts?.fresher ? '-fresher' : ''}-${format}`
    const file = path.join(OUT, `${id}.${format}`)
    if (format === 'pdf' && layout === 'scanned') {
      await page.setContent(`<html><body>${HTML.classic(p)}</body></html>`)
      const png = await page.screenshot({ fullPage: true, encoding: 'base64' })
      await page.setContent(`<html><body style="margin:0"><img src="data:image/png;base64,${png}" style="width:100%"></body></html>`)
      fs.writeFileSync(file, await page.pdf({ format: 'A4', printBackground: true }))
    } else if (format === 'pdf') {
      await page.setContent(`<html><head><meta charset="utf-8"></head><body>${HTML[layout](p)}</body></html>`)
      fs.writeFileSync(file, await page.pdf({ format: 'A4', printBackground: true, margin: layout === 'sidebar' ? undefined : { top: '10mm', bottom: '10mm' } }))
    } else if (format === 'docx') {
      const spec = DOCX[layout](p)
      const doc = new Document({ sections: [{ properties: {}, headers: spec.headers, footers: spec.footers, children: spec.children }] })
      fs.writeFileSync(file, await Packer.toBuffer(doc))
    } else {
      fs.writeFileSync(file, pasted(p))
    }
    const t = truth(p)
    fs.writeFileSync(path.join(OUT, `${id}.truth.json`), JSON.stringify(t, null, 2))
    manifest.push({ id, file: path.basename(file), layout, format, fresher: !!opts?.fresher, expect: layout === 'scanned' ? 'rejected-scan' : 'parsed', dateStyle: p.dateStyle })
  }
}
await browser.close()
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`wrote ${manifest.length} CVs to ${OUT}`)
