# Recorded voice interviews — test branch

Status: implemented behind a server flag; not released or migrated in production.

## User journey
Select a saved resume and the existing mode, difficulty and question count. Start opens a dedicated interview room. Choose a male or female illustrated interviewer. Device text-to-speech reads the visible question with a simple animated mouth; replay remains available. This is not a live interviewer or video call.

Start speaking requests microphone permission. Pause, resume, stop/listen and re-record are available. Seven seconds of silence after speech pauses recording; it does not discard or automatically grade the answer. Each answer is capped at three minutes and 8 MiB. Submit saves the recording, then Next question advances explicitly. After all answers are saved, Review my interview starts transcription and coaching. No transcription or grading runs while recording.

Review saves each successful transcription and each successful feedback result independently, so retries retain completed work. The report includes suggested answers, wording corrections, content feedback and observable speaking measures. Progress compares the same frozen resume/job, mode, difficulty, count and rubric. Different generated questions can affect scores; these are practice indicators, not validated hiring predictions. Pace and pauses do not establish confidence, emotion or ability. Speech transcripts may contain errors and must be checked against the audio.

## Preview setup
1. Use a separate Supabase preview project with the existing migrations. Apply `supabase/migrations/057_recorded_voice_interviews.sql` there after reviewing it. Never paste production credentials into this branch.
2. Configure the existing Supabase server/service-role and text AI environment variables.
3. Set server-only `VOICE_INTERVIEWS_ENABLED=true` and `VOICE_STT_API_KEY` to an OpenAI key authorized for Whisper transcription. No public key variable is added. Transcription uses the fixed OpenAI audio endpoint, whisper-1, English and timestamp output. Text coaching continues through the existing AI gateway and controls.
4. Configure `CRON_SECRET` and a scheduler sending `Authorization: Bearer <CRON_SECRET>` to `/api/cron/voice-interview-review`. Each request processes one answer or final report and drains delayed deletion work. Schedule frequent invocations for unattended reviews; concurrency is guarded by database leases. Check hosting plan frequency and 180-second function support before enabling a schedule. This branch does not alter the production cron schedule. Active interview pages also drive review processing; without a scheduler a closed page can leave review pending and delayed deletion unfinished.
5. Open the HTTPS preview, sign in and select a completed resume. Capability checks require the flag, transcription key and database table. Disabling the flag blocks new voice starts and worker processing; existing text history remains readable.

TTS uses browser speech synthesis and available device voices, with no live AI connection. Autoplay may require Replay question. The chosen avatar appearance does not guarantee a matching device voice. A missing browser microphone API/permission produces a recovery message.

## Storage and controls
Private bucket `mock-interview-audio`; signed upload and short-lived playback URLs are issued only after ownership checks. Sessions and answers allow owner reads and service-only mutations; anonymous/cross-user access is denied. All review calls use existing quotas/concurrency controls; transcription adds `mock_interview_transcription` (default daily limit 150). Successful saved steps consume quota. No new payment charge or subscription change is implemented.

Sessions retain frozen profile and question snapshots for grounded review and comparable history. Audio, transcript, feedback and report remain until the user deletes the interview or its parent package/account. Delete removes the package history entry and clears review snapshots, then removes audio. A three-hour cleanup window catches uploads made with previously issued two-hour tokens; cascade deletions queue paths for the worker too. Owner playback URLs already issued can remain valid for up to five minutes. Cleanup requires the scheduled worker. Stopped but unsubmitted recordings are kept in IndexedDB on that device for recovery; successful submission or interview deletion clears them. An active recording is not guaranteed recoverable after closing the browser.

## Validation before release
`npm run check` includes the disposable Postgres voice lifecycle suite, requiring no production database. Local browser verification uses fake microphone input and mocked server replies; it cannot verify the live provider or deployed storage.

Before merge, test real iOS Safari and Android Chrome, denied permission, seven-second silence, background/phone interruption, replay, upload loss/retry, same-device recovery, all 5/10/15 question flows, explicit review, provider timeout/quota retry, closing/reopening during review, complete report, comparable second attempt, and private playback/deletion across two accounts. Confirm scheduler completes a review without an open browser and removes delayed/cascaded audio. Verify legacy text history. Validate costs and 180-second function support. Do not enable production until these checks pass.

Reference: https://platform.openai.com/docs/guides/speech-to-text

## Branch verification — 2026-09-26

Passed TypeScript, lint, production build and all 26 `npm test` suites (including 29 voice-specific database assertions). Browser run at 320, 390 and 1280 px passed recording, manual pause/resume, submit, explicit next, saved-answer reload and explicit-only review with fake microphone input and mocked API/storage responses. No horizontal overflow or browser runtime errors observed. Real TTS voices, automatic silence on real microphones, provider review and deployed storage/scheduler remain release gates above.
