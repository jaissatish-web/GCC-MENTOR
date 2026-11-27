# AI services and factual integrity

Production Baseline V1.0 · source `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`.

`lib/ai/providerConfig.ts` reads server-side task configuration from `ai_provider_config`. `app/admin/ai-provider/` manages provider and model choices. The primary and optional fallback are resolved through `lib/ai/provider.ts` and `lib/ai/runTask.ts`. OpenRouter is supported and reported as the production provider. The source does not establish which mutable model and fallback settings are currently active. The voice route has separate enablement and transcription configuration in `lib/voice/`.

| Task | Prompt, validation and context owners |
| --- | --- |
| Resume extraction | `lib/ai/extractionPrompt.ts`, `lib/resumeParse/`, `app/api/parse/`. User reviews extracted facts before profile save. |
| Target job analysis and scoring support | `lib/ai/jobDescriptionPrompt.ts`, `lib/ai/jobMatchExplanation.ts`, `lib/jobMatch/`. Rule-based calculations stay separate from model prose. |
| Resume optimization | `lib/ai/buildOptimizationPrompt.ts`, `lib/optimizer/`, `lib/ai/validateGrounding.ts`, `app/api/optimize/`. |
| Cover letter | `lib/ai/buildCoverLetterPrompt.ts`, `lib/ai/validateCoverLetterGrounding.ts`. Profile and target context support draft generation and user edits. |
| Interview Q&A | `lib/ai/buildInterviewQaPrompt.ts`, `lib/ai/validateInterviewQa.ts`, `lib/ai/answerGrounding.ts`. Target package and confirmed career evidence guide preparation. |
| Mock Interview and report | `lib/ai/buildMockInterviewPrompt.ts`, `lib/ai/validateMockInterview.ts`, `lib/voice/` and package interview routes. Prompts use the target and answer evidence; recorded audio uses the transcription path before review. |
| LinkedIn and NaukriGulf | `lib/ai/buildLinkedInPrompt.ts`, `lib/ai/buildNaukrigulfPrompt.ts`, `lib/ai/validateLinkedIn.ts`, profile-platform service modules. |
| ATS and file checks | `lib/ai/atsScorePrompt.ts`, `lib/atsFileCheck.ts` and the public and package ATS handlers. Use the respective route to distinguish generated interpretation from deterministic checks. |

Optimizer levels represent different fit and rewrite needs. Easy emphasizes alignment of closely matching evidence. Moderate can reorganize confirmed experience and surface transferable skills. Hard makes related evidence and gaps explicit for a more distant target. Any level must preserve facts. `app/api/optimize/route.ts` selects the configured engine and orchestrates confirmation, generation, validation and persistence. Some flows use deterministic processing or skip AI when input is inadequate.

Separate confirmed candidate facts from job requirements. Label relevance as an inference, practice examples as hypothetical, and unknown details as missing. Prevent JD terms from becoming claimed duties, certifications or project facts. Preserve precision of dates and ask for missing facts when a claim depends on them.

`lib/ai/serviceGuard.ts` and wallet controls gate work before provider calls and settle or release authorization according to outcome. `lib/ai/promptTemplates.ts` resolves the editable portion of selected prompts. Structural guards, timeouts, output parsing and eligible fallback/retry behaviour live in task execution and route code.

Recent live QA reported factual accuracy problems in some generated outputs. Grounding checks are incomplete safeguards and this baseline does not verify that every output is factually correct. Recorded Mock Interview transcription has previously encountered provider HTTP 402. Live provider health and quality remediation are outside this baseline.
