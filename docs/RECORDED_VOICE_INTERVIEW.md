# Recorded voice interviews — test branch

> **2026-10-22 status:** Recorded voice code is on main, subject to server/provider/storage configuration; the “test branch” title is historical. Runtime availability was not verified in this session.

Status: implemented on main. Voice starts/reviews remain controlled by the existing server flag and provider/storage configuration. The founder authorized migration 068 on 2026-10-09 to retain all mock attempts using the existing tables. No new billing behavior.

## User journey
Select a saved resume and the existing mode, difficulty and question count. Start opens a dedicated interview room. Choose a male or female illustrated interviewer. Questions are displayed as text. The seated portrait fits entirely inside the panel without cropping, zooming or scale animation. Candidates read each question before recording. This is not a live interviewer or video call.

Start speaking requests microphone permission. Pause, resume, stop/listen and re-record are available. Seven seconds of silence after speech pauses recording; it does not discard or automatically grade the answer. Each answer is capped at three minutes and 8 MiB. Submit saves the recording, then Next question advances explicitly. After all answers are saved, Review my interview starts transcription and coaching. No transcription or grading runs while recording.

The workspace shows numbered saved-attempt cards with a graphical progress journey below them. Opening a completed attempt displays a dedicated eight-card result explorer; answers open question cards and separate transcript/feedback/stronger-answer/delivery tabs. Coaching cards expand individually. Dashboard reuses the five-area chart, actual first/previous differences, improved areas and next focus. Coloured points connect matching frozen-resume/settings/rubric attempts only; grey points are separate baselines. All feedback remains the saved content. Browsing completed reports never starts or resumes AI processing. Recording and explicit review behavior remain unchanged.

Migration 068 removes only the mock ten-run limit and makes append idempotent by run id. It restores missing owner-matched voice snapshots, saved transcripts/feedback and reports from the existing session/answer tables; retained package runs are untouched. Deleting sessions are excluded. Previously pruned legacy text runs without a separate session cannot be reconstructed. Cover letter/Q&A limits and audio expiry stay unchanged. Roll back application code without deleting history; the old append function can be restored separately if its old limit is explicitly wanted.

Review saves each successful transcription and each successful feedback result independently, so retries retain completed work. The report includes suggested answers, wording corrections, content feedback and observable speaking measures. Progress compares the same frozen resume/job, mode, difficulty, count and rubric. Different generated questions can affect scores; these are practice indicators, not validated hiring predictions. Pace and pauses do not establish confidence, emotion or ability. Speech transcripts may contain errors. Review the transcript before relying on it; successfully transcribed server recordings are deleted and cannot be replayed afterward.

## Preview setup
1. The existing Supabase project now contains migration `057_recorded_voice_interviews.sql`, applied with founder authorization. Connect only the Vercel preview branch to the existing project settings. Do not reapply this migration or commit credentials. Test data shares the existing database.
2. Configure the existing Supabase server/service-role and text AI environment variables.
3. Set server-only `VOICE_INTERVIEWS_ENABLED=true`. Transcription first reuses the existing server-side OpenRouter API key in `ai_provider_config` (the mock-interview configuration if it uses OpenRouter, otherwise the default OpenRouter configuration). No new API key is needed when that account is configured. An optional server-only `VOICE_STT_API_KEY` is supported for a direct OpenAI fallback if no OpenRouter configuration exists. The default model is `openai/gpt-4o-mini-transcribe` via OpenRouter; it provides a transcript but no word timestamps, so the speaking report shows pace and fillers while pause count is unavailable. `VOICE_STT_MODEL=openai/whisper-large-v3-turbo` selects a cheaper OpenRouter test option; compare accent and technical-term accuracy before selecting it broadly. `VOICE_STT_MODEL=openai/gpt-transcribe` selects the supported long-term successor. `VOICE_STT_MODEL=openai/whisper-1` temporarily enables timestamp-based pause observations. Change the branch variable and redeploy to switch. OpenAI plans to remove both mini and Whisper 1 on 2027-02-26, so switch to GPT Transcribe before then. No public key variable is added. Text coaching continues through the existing AI gateway and controls.
4. Configure `CRON_SECRET`. The existing daily `/api/cron/retention` schedule removes abandoned voice objects after their three-day deadline and retries pending early cleanup, while a scheduler calling `/api/cron/voice-interview-review` can process unattended reviews and also drains cleanup work. Concurrency is guarded by database leases. Check hosting plan frequency and 180-second function support before adding the review schedule. Active interview pages also drive review processing; without a review scheduler a closed page can leave review pending, but the daily audio-expiry cleanup still runs.
5. Open the HTTPS preview, sign in and select a completed resume. Capability checks require the flag, transcription key and database table. Disabling the flag blocks new voice starts and worker processing; existing text history remains readable.

Question TTS is deferred. No browser speech synthesis, speech playback control or mouth-speaking animation runs. Speech-to-text is still required for candidates’ saved answers when they request review. A missing browser microphone API/permission produces a recovery message.

## Storage and controls
Private bucket `mock-interview-audio`; signed upload and short-lived playback URLs are issued only after ownership checks. Sessions and answers allow owner reads and service-only mutations; anonymous/cross-user access is denied. After each real transcription is persisted, the leased review flow immediately attempts to remove that answer’s Storage object and records audio_deleted_at. Transcripts, answer feedback and final reports remain. If later coaching fails, retry uses the saved transcript rather than the deleted audio. Failed transcription, failed persistence and the no-speech fallback retain audio for retry until the existing three-day abandonment expiry. All review calls use existing quotas/concurrency controls; transcription adds `mock_interview_transcription` (default daily limit 150). Successful saved steps consume quota. No new payment charge or subscription change is implemented.

Sessions retain frozen profile and question snapshots for grounded review and comparable history. Untranscribed/abandoned audio expires 72 hours after it is prepared; successfully transcribed audio is removed earlier. Transcript, feedback and report remain until the user deletes the interview or its parent package/account. Delete removes the package history entry and clears review snapshots, then removes any remaining audio. A three-hour cleanup window catches uploads made with previously issued two-hour tokens; cascade deletions queue paths for the worker too. Owner playback URLs already issued can remain valid for up to five minutes. Cleanup requires the scheduled worker. Stopped but unsubmitted recordings are kept in IndexedDB on that device for recovery; successful submission or interview deletion clears them. An active recording is not guaranteed recoverable after closing the browser.

## Validation before release
`npm run check` includes the disposable Postgres voice lifecycle suite and offline OpenRouter/OpenAI transcription request contracts, requiring no production database. Local browser verification uses fake microphone input and mocked server replies; it cannot verify the live provider or deployed storage.

Before merge, test real iOS Safari and Android Chrome, denied permission, seven-second silence, background/phone interruption, saved-answer playback, upload loss/retry, same-device recovery, all 5/10/15 question flows, explicit review, provider timeout/quota retry, closing/reopening during review, complete report, comparable second attempt, and private playback/deletion across two accounts. Confirm scheduler completes a review without an open browser and removes delayed/cascaded audio. Verify legacy text history. Validate costs and 180-second function support. Do not enable production until these checks pass.

Reference: https://platform.openai.com/docs/guides/speech-to-text

## Branch verification — 2026-09-26

Passed TypeScript, lint, production build and all 26 `npm test` suites (including 29 voice-specific database assertions). Browser run at 320, 390 and 1280 px passed recording, manual pause/resume, submit, explicit next, saved-answer reload and explicit-only review with fake microphone input and mocked API/storage responses. No horizontal overflow or browser runtime errors observed. Automatic silence on real microphones, provider review and deployed storage/scheduler remain release gates above.

## History/mobile verification — 2026-10-09

`npm run check` passes 49 suites, including dedicated comparison/API/history
recovery tests and existing owner RLS/lifecycle/optimizer checks. Production build
passes. `CHROME_PATH=/path/to/chromium npm run test:interview` uses actual React
workspace/report/dashboard components, synthetic API replies and production CSS
at 320/360/390/430/768/1440px. It verifies 12 attempt cards and chart points, the eight-category explorer,
question cards and voice tabs, unchanged saved priority text, dashboard charts,
all six uncropped portraits and no AI writes/layout overflow/runtime errors. Shared mobile/enlarged-text checks also pass.
These offline fixtures do not verify live provider calls or real phone recording.

## Approved — 30 October 2026: disposable audio after transcription

AUDIO-DELETE-001: after a real transcription is persisted under the current owner/session review lease, immediately remove only that answer's Storage object and mark audio_deleted_at. The founder explicitly selected the transcript-save checkpoint: subsequent AI coaching/report failure retries from the saved transcript without audio. Failed transcription, failed persistence, no-speech fallback and stale leases must not trigger this deletion. Missing objects are idempotent success; storage/marker failures retain a retriable cleanup path and must not discard transcript or block coaching.

Reuse existing voice lifecycle, private bucket, expiry fields and cleanup queue. Keep the three-day abandoned-file safety net. Bound backlog cleanup by per-run item/time budgets with before/after counts, and include voice plus operational steps in the existing maintenance_runs record; no duplicate success row before voice finishes. No schema/auth/scoring/payment changes. Tests must cover success, failures, lease expiry, replay410, retries, backlog above one batch, hard cap and maintenance logging. CRON_SECRET metadata is absent on the connected production Vercel project as of this inspection; no value was retrieved. Implementation is described below; release verification is tracked only in docs/14_OPEN_ITEMS.md.

### AUDIO-DELETE-001 implementation contract

The real schema field is `voice_interview_answers.transcript` (not transcript_text). `updateAnswer` now requires a returned row under the existing session/user/lease check. `deleteTranscribedAudio` verifies that exact saved transcript, question and owned path, queues a delayed removal before expiring the object early, rechecks the lease, removes Storage audio, then marks audio_deleted_at. A missing object is success; genuine failures preserve the transcript and cleanup path. A resumed review retries cleanup before coaching and never retranscribes an existing transcript. The no-speech sentinel is not a successful STT result and is excluded.

Signed-upload tokens can recreate a deleted path before their two-hour expiry; an existing voice_audio_cleanup entry remains due three hours after early cleanup even when audio_deleted_at is set. Queue creation precedes the immediate retry deadline so the retention worker cannot early-delete without that delayed protection. If queue creation itself fails, the original three-day expiry remains the fallback. The delayed queue stores only an existing owned object path, not transcript content.

No schema changes or production data deletion are part of this PR. UI strings promising that all saved recordings remain safe/available after a later review failure are flagged in the PR for a separate copy decision; they are not silently rewritten.

### Local verification — 30 October 2026

59 focused lifecycle assertions pass using the actual review helper/pipeline and playback route with synthetic Storage/DB/provider replies. Cases include mixed success/failure, no-speech, failed/zero-row persistence, lease/owner/path mismatch, cleanup/storage/marker failures, hanging deletion timeout, report-failure retry without STT, delayed queue protection and unchanged playback410. Retention tests pass multi-batch cleanup,2,000-item/time caps, scoped writes, missing objects versus missing buckets, transcript preservation, one all-step maintenance record and fail-closed cron. Production build/typecheck/lint pass; the full repository suite result is recorded in PROGRESS.md. No production audio, provider request or authenticated scheduler execution was exercised.
