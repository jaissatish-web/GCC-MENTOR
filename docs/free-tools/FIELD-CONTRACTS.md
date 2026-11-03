# Proposed field contracts and independent fixtures — IDs11–50

Planning refinement only. None of these contracts claims implementation, official vendor limits, production verification or legal applicability. Reconcile UI, educational content and tests against one final contract before release.

## Shared conventions

- Money: decimal input with at most two fractional digits unless a tool explicitly permits a higher-precision rate; no intermediate rounding, display two decimals, disclose display rounding. Currency labels do not convert amounts. Reject blank, NaN, Infinity and overflow; distinguish zero from missing. Financial outputs may be negative when mathematically meaningful; never silently clamp a deficit.
- General numeric cap: absolute1e12; integer counts with tool-specific caps below. Explicitly document chosen caps as operational limits, not business/legal limits. Rates may use up to eight decimal digits; reject nonpositive rates.
- Text: trim for required-field validation but preserve original text in generated output. Count caps in Unicode codepoints. Never use dangerouslySetInnerHTML or include user input in events. Browser inputs are not sent to AI/profile APIs.
- Dates: accept exact YYYY-MM-DD and validate round trip (2026-02-30 must fail), years1900–2200 operational cap. UTC date-only arithmetic avoids device DST. Show endpoint convention; intervals use closed inclusive [start,end] unless explicitly stated otherwise. Do not parse locale-ambiguous date strings.
- Instants: explicit ISO UTC Z or numeric offset, never infer zone from device location. For interview times, require the user to confirm resulting UTC and display-zone time. A bare local date/time in a DST zone can be nonexistent or ambiguous.
- Errors: missing fields, format errors and bounds attach to actual fields; no fabricated result on error. Reset clears result and invalid state. Copy handles permission failure; print action labelled browser print/save PDF. Privacy-safe events contain only slug/event/error category.
- Independent fixtures below are minimum examples, not exhaustive certification. Add negative/missing/huge/precision, limits, reset/copy and per-tool browser tests. Use test-injected clocks; freeze now only in tests.
- Default values are UX assumptions and must be labelled. No LinkedIn length default, reading-speed default, bullet-length limit, legal day divisor or weekend pattern is represented as independently verified.

## 11. Salary Breakup Calculator

**Fields and units:** basic, housing, transport, other: nonnegative monthly money; deductions: nonnegative monthly money; currency: display label.

**Calculation and output contract:** Gross=sum earnings; net=gross−deductions, allowed negative with warning. No tax inference.

**Independent fixtures:** 5,000+1,500+500+0−200 → gross7,000; net6,800. All earnings0 and deduction0 →0.

## 12. Annual Salary Calculator

**Fields and units:** pay: nonnegative money/payment; paymentsPerYear: integer1–366; annualBonus: nonnegative money/year; currency.

**Calculation and output contract:** Annual=pay×paymentsPerYear+annualBonus. User selects payment count, no inferred payroll schedule.

**Independent fixtures:** 6,000×12+3,000=75,000. 1,000×52=52,000.

## 13. Salary Increment Calculator

**Fields and units:** currentPay: nonnegative money/period; incrementPercent:0–1000; currency; period label.

**Calculation and output contract:** Increase=current×percent/100; revised=current+increase. No allowance inference.

**Independent fixtures:** 5,000 and8 → increase400; revised5,400. 0 and8 →0.

## 14. Salary Percentage Change Calculator

**Fields and units:** oldPay: positive money/period; newPay: nonnegative money/same period; currency.

**Calculation and output contract:** Difference=new−old; percent=difference/old×100. Zero old rejected; decreases valid.

**Independent fixtures:** 5,000→5,500 =+500,+10%; 5,000→4,500=−500,−10%.

## 15. Salary Comparison Calculator

**Fields and units:** payA,payB: nonnegative money/payment; periodsA,periodsB: integer1–366; annualExpensesA,B: nonnegative money/year; commonCurrency.

**Calculation and output contract:** Annualize each; remaining=annualPay−annualExpenses; show differences and ratio only when baseline>0.

**Independent fixtures:** A6,000×12−36,000=36,000; B7,000×12−54,000=30,000; A leaves6,000 more.

## 16. Savings Goal Calculator

**Fields and units:** goal,saved: nonnegative money; monthlySaving: nonnegative money/month; currency.

**Calculation and output contract:** Remaining=max(0,goal−saved); months=ceil(remaining/monthlySaving). Already reached→0; unmet with zero saving→unreachable, no divide by0.

**Independent fixtures:** 20,000−5,000 at2,000/month→8months; saved≥goal→0.

## 17. Monthly Budget Planner

**Fields and units:** monthlyIncome: nonnegative money; expenseRows:0–50 {label≤80chars,amount≥0}; currency.

**Calculation and output contract:** Expense=sum rows; balance=income−expense; savingsPercent=100×balance/income if income>0, else unavailable.

**Independent fixtures:** Income8,000; expenses3,000+2,000+1,000→balance2,000; savings25%.

## 18. Remittance Calculator

**Fields and units:** amount: nonnegative sending money; sendingFee≥0 sending money; rate>0 receiving units/sending unit; receivingFee≥0 receiving money; currency labels.

**Calculation and output contract:** Reject sendingFee>amount; received=(amount−sendingFee)×rate−receivingFee. Negative received flagged infeasible rather than silently clamped. No live quotes.

**Independent fixtures:** (1,000−10)×22−50=21,730. amount10 fee11 rejected.

## 19. Cost of Living Comparison Calculator

**Fields and units:** locationA,B labels≤80chars; rows≤50 {category≤80chars,costA≥0,costB≥0}; commonCurrency; period label.

**Calculation and output contract:** Sum A/B; delta=B−A; percent=delta/A×100 if A>0; no automatic currency conversion or city data.

**Independent fixtures:** A4,000 B5,200→B costs1,200 more,+30% vsA. A0→percentage unavailable.

## 20. Job Offer Comparison Calculator

**Fields and units:** offerA,B labels≤80chars; criterionRows1–20 {label≤80chars,weight0–100,ratingA0–10,ratingB0–10}.

**Calculation and output contract:** User-selected ratings and relative weights, no hidden normalization. Each score=sum(weight×rating)/sum(weight); require total weight>0. Display every contribution and tie.

**Independent fixtures:** Salary weight2 A8 B7; work-life weight1 A6 B9→A7.3333,B7.6667. All weights0 rejected.

## 21. Resume Keyword Matcher

**Fields and units:** resumeText,jobText: required1–50,000Unicode codepoints each.

**Calculation and output contract:** Recommend documented exact token rule: lowercase; NFKC; tokenize letter/number runs preserving internal +/# where useful; visible stopword list; unique eligible JD tokens. Match exact normalized tokens, not substrings. Report overlap and matched/missing terms. No ATS score.

**Independent fixtures:** JD “calibration safety calibration reporting”; resume “Safety calibration” →3unique terms,2matched,66.67%. JD empty rejected; all-filtered JD→no eligible terms, no score.

## 22. Job Description Keyword Extractor

**Fields and units:** jobText: required1–50,000codepoints; minimumOccurrences:integer1–100; maximumResults:integer1–100.

**Calculation and output contract:** Same published tokenizer/stopwords as21. Count retained tokens; sort count descending then lexical stable tie-break; no inferred phrases or skills.

**Independent fixtures:** “calibration calibration commissioning”→calibration2,commissioning1. minOccurrences2→only calibration.

## 23. Resume Word Counter

**Fields and units:** text:0–50,000Unicode codepoints; optional readingRate:integer50–1000words/minute.

**Calculation and output contract:** Words=nonempty whitespace-separated tokens after trim. Characters=Unicode codepoints; lines=empty0 else split CRLF/LF/CR including blank lines. Reading estimate=words/rate, explicitly optional assumption.

**Independent fixtures:** “Led site commissioning”→3words,22codepoints,1line. Empty→0/0/0. “A\n\nB”→2words,4characters,3lines.

## 24. Resume Bullet Length Checker

**Fields and units:** text:1–50,000codepoints; maxWords:integer1–200; maxCharacters:integer1–2000; mode:words/characters/both.

**Calculation and output contract:** Treat each nonblank input line as one bullet after removing at most one common bullet marker; do not infer wrapped bullets. Flag strictly greater than threshold; show actual counts and excess.

**Independent fixtures:** At maxWords3: “Led site commissioning”3 passes; “Led all site commissioning”4 exceeds by1.

## 25. Resume Action Verb Checker

**Fields and units:** text:1–50,000codepoints; visible curated verb list; optional custom verbs≤100tokens.

**Calculation and output contract:** One nonblank line per bullet, trim marker, first token normalized; check exact membership. Show recognized/unrecognized, not pass/fail grammar verdict.

**Independent fixtures:** List includes led,managed: “• Led team” recognized; “Responsible for team” unrecognized. Empty lines ignored.

## 26. Resume Contact Information Validator

**Fields and units:** email optional≤254ASCII chars; phone optional≤40chars; LinkedIn URL optional≤2048chars; at least one supplied.

**Calculation and output contract:** Syntax-only. Email pragmatic non-whitespace local@domain with domain labels, explicitly not exhaustive RFC validation. Phone remove spaces/()- then optional leading+ and7–15digits as chosen broad review rule, no country validity claim. URL parse HTTPS host linkedin.com or www.linkedin.com, /in/nonempty path; no network requests.

**Independent fixtures:** name@example.com structurally accepted; name.example.com flagged. https://evil.com/linkedin.com/in/name rejected. linkedin.com.evil.test rejected.

## 27. Resume Section Checker

**Fields and units:** text:1–50,000codepoints; displayed common-heading aliases.

**Calculation and output contract:** Compare trimmed whole heading lines, case-insensitive and optional trailing colon; avoid substring matches inside paragraphs. Output recognized headings and prompts for unrecognized common sections.

**Independent fixtures:** “Skills:\nCalibration” recognizes Skills; “Improved team skills” must not count as a section heading.

## 28. Resume Employment Date Checker

**Fields and units:** periodRows1–50 {label≤100,start:YYYY-MM-DD,end:YYYY-MM-DD}; no free-text date guessing.

**Calculation and output contract:** Strict ISO date-only validation; closed inclusive intervals [start,end]; reject end<start. Overlap when max(start)<=min(end). Flag pair and intersecting dates; no verdict that overlap is wrong.

**Independent fixtures:** Jan1–Jan31 andJan31–Feb15 overlap1day. Jan1–Jan31 andFeb1–Feb15 do not overlap. Feb30 rejected.

## 29. ATS Formatting Checklist

**Fields and units:** checklist: fixed disclosed items plus optional user rows≤50; checkbox state; notes per row≤500chars.

**Calculation and output contract:** Completion=checked/total, not ATS compatibility score. Every prefilled item is unchecked; no automatic file inspection claims. Print/copy with selected states.

**Independent fixtures:** 6of8 checked→75% checklist complete. 0items→0completed and percentage unavailable.

## 30. Resume File Size Checker

**Fields and units:** File via browser input only; targetLimit:positive decimal0.001–1000; unit:MB orMiB.

**Calculation and output contract:** Use file.size bytes; MB=1,000,000bytes,MiB=1,048,576bytes. At-limit passes; no MIME/content/safety assertion. File itself is not read/uploaded.

**Independent fixtures:** 1,000,000bytes→1MB≈0.953674MiB; limit1MB passes.1,000,001bytes exceeds1MB.

## 31. Professional Experience Calculator

**Fields and units:** periodRows1–50 {start,end:strictYYYY-MM-DD,label≤100}; explicit asOf for current roles.

**Calculation and output contract:** Closed inclusive intervals; merge overlapping/adjacent periods; sum integer unique calendar days. Display days authoritative; any years conversion approximate and labelled, do not claim full-time equivalence.

**Independent fixtures:** Jan1–Jan10 plusJan5–Jan15→15unique days. Same-day role→1day; duplicate interval adds0days.

## 32. Employment Gap Calculator

**Fields and units:** periodRows1–50 strict dates; optional windowStart/windowEnd supplied together.

**Calculation and output contract:** Merge inclusive employment periods; each internal gap=[previousEnd+1,nextStart−1]. Default only gaps between first and last employment. Window optional includes uncovered leading/trailing days within window.

**Independent fixtures:** End2026-01-31 and nextstart2026-03-01→2026-02-01…28=28days. Adjacent periods→no gap.

## 33. Interview Countdown Calculator

**Fields and units:** interviewInstant: strict ISO8601 UTC endingZ (e.g.2026-11-03T12:00:00Z), or explicit date/time plus numeric offset±HH:MM; displayZone:validated IANA zone; clock now injectable in tests.

**Calculation and output contract:** Avoid ambiguous naive local datetime. If UI accepts local time it must require explicit offset and show resulting UTC instant; a named zone alone needs robust ambiguous/nonexistent-time handling. Delta=targetEpoch−nowEpoch; floor whole seconds; future days24h chunks. Past status, no future negative counter.

**Independent fixtures:** Now2026-11-03T10:00:00Z, interview2026-11-04T10:00:00Z→24h. 15:00+03:00→12:00Z. DST repeated1:30 with no offset rejected.

## 34. Interview Preparation Checklist

**Fields and units:** taskRows1–100 {label1–200chars,done:boolean}; role optional label≤100.

**Calculation and output contract:** Editable suggested generic tasks; all unchecked initially; count and percentage only. Memory-only unless explicit local persistence disclosed. Copy and print result.

**Independent fixtures:** Tasks5,done3→60%; reset unchecks or restores initial list as labelled, no readiness inference.

## 35. Job Application Tracker

**Fields and units:** applicationRows≤500 {id,employer1–100,role1–150,status enum,appliedDate optionalISOdate,followUpDate optionalISOdate,url optionalHTTPS≤2048,notes≤2000}; importJSON≤1MB.

**Calculation and output contract:** localStorage versioned key; validate imported schema, reject unknown/prototype keys; capped rows; preserve data on failed import. Status values user-set. Catch quota/security/JSON errors; warn persistence unavailable. Export JSON, delete with explicit action. Never use HTML rendering for text.

**Independent fixtures:** Create Applied row, update Interview, reload→retained if storage works; export/import round trip. Corrupt JSON→visible warning, no crash. Clear→0rows. No CV/secrets stored.

## 36. Job Search URL Builder

**Fields and units:** role1–150chars; location optional≤150; site enum supported destinations.

**Calculation and output contract:** Use URL and URLSearchParams; HTTPS allowlisted hostname; encode query safely. Clearly open external searches, no scraping/application API. Site URL patterns require current verification before publishing supported option.

**Independent fixtures:** Role “I&C Engineer” must round-trip through URLSearchParams as one query value; & cannot create extra parameters; javascript: destination impossible.

## 37. LinkedIn Headline Length Checker

**Fields and units:** headline0–2000codepoints; userLimit:integer1–2000.

**Calculation and output contract:** Count Unicode codepoints via Array.from, not UTF16 length; show count and remaining; negative remaining allowed. Explain destination may count graphemes differently; limit user-set, no unverified LinkedIn default.

**Independent fixtures:** “ABC”limit5→3used,2remaining. “A😀”→2codepoints. Combining e+accent→2codepoints although visually1letter.

## 38. Resignation Letter Generator

**Fields and units:** name1–100; employer1–150; role optional≤150; recipient optional≤100; proposedLastDay strictISOdate; noticeText optional≤500.

**Calculation and output contract:** Plain-text deterministic template; no invented notice duration. Label proposed date and draft. All content escaped in UI. No sending, employer-notification or legal-compliance claim.

**Independent fixtures:** NameA/employerB/lastday2026-06-30 appear exactly. Empty employer rejected; HTML-like name displayed literally, never executed.

## 39. Experience Letter Generator

**Fields and units:** name1–100; employer1–150; role1–150; start/end strictISO; duties optional≤5000; signatory optional≤150.

**Calculation and output contract:** Generate plain-text draft for employer review; no official certification/seal/signature invented; date ordering required. Optional fields omitted when empty.

**Independent fixtures:** Instrument Technician stays exactly that title. End before start rejected; no unsupported performance praise inserted.

## 40. Salary Negotiation Email Template Generator

**Fields and units:** recipient optional≤100; candidate1–100; role1–150; offerAmount≥0; requestedAmount>0; currency label≤12; payPeriod label≤30; rationale1–2000.

**Calculation and output contract:** Plain-text courteous template using supplied facts only. No market salary, competing offer or achievements invented. Offer/target same currency/period; label draft, never send.

**Independent fixtures:** Offer8,000,target9,000 appears as request9,000. Rationale “5years commissioning” preserved; no “market rate” added.

## 41. Working Days Calculator

**Fields and units:** start,end strictISOdate; weekendDays subset0–6; holidayDates≤366 strictISO unique.

**Calculation and output contract:** Closed inclusive range capped36,600days; remove chosen weekend days then distinct holidays falling on remaining weekdays. Report total dates, weekend removals and holiday removals separately.

**Independent fixtures:** 2026-06-01…07 withSat/Sun→5; addJune1holiday→4; addJune6holiday→still5withoutJune1. Same weekday date→1.

## 42. Date Difference Calculator

**Fields and units:** start,end strictISOdate; inclusive:boolean explicit false default.

**Calculation and output contract:** UTC date-only arithmetic, end>=start; elapsed=(end−start)/86400000. If inclusive,add1; display convention. Same date elapsed0,inclusive1.

**Independent fixtures:** 2026-06-01→02=1elapsed or2inclusive.2024-02-28→03-01=2elapsed. Invalid leapdate2026-02-29 rejected.

## 43. Age Calculator

**Fields and units:** birthDate,asOf strictISOdate; asOf>=birth; optional explicit leapAnniversaryPolicy enum Feb28/March1 if age years needed.

**Calculation and output contract:** Recommend completed calendar years plus authoritative elapsed days; avoid unclear years/months/days decomposition. For leap birthdays require displayed policy: Feb28 policy anniversaryFeb28 in nonleap years; March1 policy anniversaryMarch1. If Y/M/D shown define clamped month anniversaries and test them separately.

**Independent fixtures:** 1990-05-10→2026-05-10=36years.2000-02-29→2025-02-28=25withFeb28policy,24withMarch1policy. Birth=asOf→0.

## 44. Percentage Calculator

**Fields and units:** mode enum ofValue/partOfTotal/change; x,y finite numbers within±1e12; percentage finite within±1e6.

**Calculation and output contract:** Explicit labelled modes: ofValue=value×percent/100; partOfTotal=part/total×100 (total!=0); change=(new−old)/old×100(old!=0). Reject undefined denominator, no clamping.

**Independent fixtures:** 15%of8,000=1,200;20of80=25%;80→100=25%.0baseline change rejected.

## 45. Time Zone Offset Calculator

**Fields and units:** instant strictUTC ISO endingZ; zoneA,zoneB validated IANA names from supported list.

**Calculation and output contract:** Use Intl.DateTimeFormat offset data at same instant; include date in result, do not assume static offsets. Difference=offsetB−offsetA minutes; labelled B ahead/behind A; handle minute offsets.

**Independent fixtures:** Riyadh+180min,Kolkata+330min→B150min ahead. Same zone→0. Test NewYork vsUTC across DST using browser tz database, clearly environment-dependent.

## 46. Contract Expiry Countdown

**Fields and units:** referenceDate,endDate strictISOdate; allow past end dates.

**Calculation and output contract:** Signed UTC calendar-day delta=end−reference, excluding start. Future/Today/Expired statuses. No statutory deadline, auto-renewal or legal conclusion.

**Independent fixtures:** 2026-06-01→06-30=29days;same→today0;2026-06-30→06-01=expired29days.

## 47. Probation Period Date Calculator

**Fields and units:** startDate strictISOdate; duration integer1–3660calendar days; countingMode inclusive/elapsed explicitly labelled.

**Calculation and output contract:** Inclusive final=start+duration−1; elapsed milestone=start+duration. No legal maximum/default claim; no automatic exclusion/extension.

**Independent fixtures:** Start2026-06-01,duration30→inclusiveJune30;elapsedJuly1. Start2024-02-28,duration2→inclusiveFeb29.

## 48. Annual Leave Planner

**Fields and units:** start,end strictISOdate; weekendDays subset0–6; holidays≤366; balance≥0days; chargingMode working/calendar.

**Calculation and output contract:** Working mode same as41; calendar mode all inclusive dates regardless weekends/holidays. remaining=balance−used; negative allowed labelled shortfall, no approval/entitlement inference.

**Independent fixtures:** Mon2026-06-01…Fri05,weekendsSat/Sun,noholiday,balance18→used5,remaining13. June1…7calendar mode→7,working→5.

## 49. Printable Checklist Builder

**Fields and units:** title1–150; sections≤20 optional; taskRows1–200 {text1–300,done}; notes≤5000.

**Calculation and output contract:** Plain-text content only; completion=done/total; print includes title,date only if user-supplied,tasks/check state. No remote save. Print CSS must not truncate long rows.

**Independent fixtures:** 4tasks2done→50%; edit/add/remove recalculates; empty list shows0items notNaN; print preview contains every item.

## 50. Simple PDF Export Utility

**Fields and units:** documentTitle1–150; sectionRows1–30 {heading≤150,notes≤10000,tasks≤100}; document total≤50000chars.

**Calculation and output contract:** Browser print→Save as PDF; no direct-download claim. Escaped text; preserve line breaks; print layout A4/Letter selectable via browser; headings stay with following content where feasible. User content in memory unless explicitly exported.

**Independent fixtures:** Title+2sections+3tasks all appear in print preview. Text containing<script> prints literally; no scripts run. Empty document rejected; long paragraphs wrap without clipping.
