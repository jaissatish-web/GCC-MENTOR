# Tool inventory — approved, not implemented

Each row is one search intent, page, function and acceptance fixture. Search targets use the tool name naturally; no volume claims.

|ID|Tool / primary keyword|Category|Canonical route|Exact functionality / acceptance contract|
|---|---|---|---|---|
|1|GCC Gratuity Calculator|Employment|/tools/gratuity-calculator|Regime/reason/date-specific EOSB; unavailable until source matrix verified|
|2|Final Settlement Calculator|Employment|/tools/final-settlement-calculator|Sum verified wage, leave, EOSB, notice and deductions; itemized estimate|
|3|Leave Encashment Calculator|Employment|/tools/leave-encashment-calculator|Verified unused leave days × applicable wage basis|
|4|Overtime Pay Calculator|Employment|/tools/overtime-pay-calculator|Eligible hours × verified rate and premium; distinguish rest/night|
|5|Notice Period Calculator|Employment|/tools/notice-period-calculator|Verified statutory/contract notice, unit and start convention|
|6|Employment Service Duration Calculator|Employment|/tools/employment-service-duration-calculator|Calendar start/end duration; show excluded periods separately|
|7|Unpaid Leave Calculator|Employment|/tools/unpaid-leave-calculator|Salary deduction using explicit verified divisor|
|8|Daily Wage Calculator|Employment|/tools/daily-wage-calculator|Monthly wage / verified jurisdiction divisor|
|9|Hourly Wage Calculator|Employment|/tools/hourly-wage-calculator|Daily wage / verified hours|
|10|Employment Termination Timeline Calculator|Employment|/tools/employment-termination-timeline-calculator|Verified notice, termination and payout deadlines; no guessed entitlement|
|11|Salary Breakup Calculator|Finance|/tools/salary-breakup-calculator|Basic + housing + transport + other − deductions|
|12|Annual Salary Calculator|Finance|/tools/annual-salary-calculator|Pay per period × periods/year; bonuses separately|
|13|Salary Increment Calculator|Finance|/tools/salary-increment-calculator|Old pay × increment/100; show new pay|
|14|Salary Percentage Change Calculator|Finance|/tools/salary-percentage-change-calculator|(new − old)/old ×100; reject zero baseline|
|15|Salary Comparison Calculator|Finance|/tools/salary-comparison-calculator|Compare normalized annual pay and user expenses in same currency|
|16|Savings Goal Calculator|Finance|/tools/savings-goal-calculator|ceil((goal − saved)/monthly saving); zero saving handled|
|17|Monthly Budget Planner|Finance|/tools/monthly-budget-planner|Income − categorized expenses; savings ratio|
|18|Remittance Calculator|Finance|/tools/remittance-calculator|(amount − sending fee) × manual rate − receiving fee|
|19|Cost of Living Comparison Calculator|Finance|/tools/cost-of-living-comparison-calculator|User expenses in two locations; same-currency total/difference|
|20|Job Offer Comparison Calculator|Finance|/tools/job-offer-comparison-calculator|Weighted user-selected compensation and benefits; transparent weights|
|21|Resume Keyword Matcher|Resume|/tools/resume-keyword-matcher|Unique normalized JD terms found / JD terms; heuristic only|
|22|Job Description Keyword Extractor|Resume|/tools/job-description-keyword-extractor|Tokenize, stopword filter, rank repeated terms; no inferred skills|
|23|Resume Word Counter|Resume|/tools/resume-word-counter|Whitespace words, Unicode characters, lines, reading estimate|
|24|Resume Bullet Length Checker|Resume|/tools/resume-bullet-length-checker|Detect bullet lines and word/character thresholds; configurable|
|25|Resume Action Verb Checker|Resume|/tools/resume-action-verb-checker|Check bullet opening words against visible curated verb list|
|26|Resume Contact Information Validator|Resume|/tools/resume-contact-information-validator|Syntax only for email, phone, LinkedIn; no deliverability claim|
|27|Resume Section Checker|Resume|/tools/resume-section-checker|Recognize common headings; show matches and omissions|
|28|Resume Employment Date Checker|Resume|/tools/resume-employment-date-checker|Parse explicit dates, flag reversed/overlapping ranges; preserve ambiguity|
|29|ATS Formatting Checklist|Resume|/tools/ats-formatting-checklist|User-assessed formatting checks, no actual ATS score|
|30|Resume File Size Checker|Resume|/tools/resume-file-size-checker|Local file bytes, MB/MiB, user target; no upload|
|31|Professional Experience Calculator|Career|/tools/professional-experience-calculator|Merge overlapping employment intervals; do not double count|
|32|Employment Gap Calculator|Career|/tools/employment-gap-calculator|Union employment periods then compute uncovered intervals|
|33|Interview Countdown Calculator|Career|/tools/interview-countdown-calculator|Time remaining from explicit local datetime/zone|
|34|Interview Preparation Checklist|Career|/tools/interview-preparation-checklist|Editable preparation tasks with print and completion progress|
|35|Job Application Tracker|Career|/tools/job-application-tracker|LocalStorage entries, statuses, export/import; deletion warning|
|36|Job Search URL Builder|Career|/tools/job-search-url-builder|Encoded search query links for supported job sites|
|37|LinkedIn Headline Length Checker|Career|/tools/linkedin-headline-length-checker|Unicode character count against editable headline limit|
|38|Resignation Letter Generator|Career|/tools/resignation-letter-generator|Template from user name, employer, last date; no legal assurance|
|39|Experience Letter Generator|Career|/tools/experience-letter-generator|Draft for employer review with supplied facts only|
|40|Salary Negotiation Email Template Generator|Career|/tools/salary-negotiation-email-template-generator|Template based on supplied offer/target and truthful rationale|
|41|Working Days Calculator|General|/tools/working-days-calculator|Inclusive range minus chosen weekends and explicit holidays|
|42|Date Difference Calculator|General|/tools/date-difference-calculator|UTC calendar day difference; show convention|
|43|Age Calculator|General|/tools/age-calculator|Completed years/months/days with leap-day policy|
|44|Percentage Calculator|General|/tools/percentage-calculator|Value × percentage/100; percentage of total and change separated|
|45|Time Zone Offset Calculator|General|/tools/time-zone-offset-calculator|Intl timezone offsets at selected instant including DST|
|46|Contract Expiry Countdown|General|/tools/contract-expiry-countdown|Days to supplied contract end; no renewal inference|
|47|Probation Period Date Calculator|General|/tools/probation-period-date-calculator|Add user-supplied calendar days; no legal maximum claim|
|48|Annual Leave Planner|General|/tools/annual-leave-planner|Inclusive dates minus weekends/holidays; user balance remaining|
|49|Printable Checklist Builder|General|/tools/printable-checklist-builder|Editable list, completed items and accessible print|
|50|Simple PDF Export Utility|General|/tools/pdf-export|User-created structured notes/checklist with browser Print → Save as PDF|
