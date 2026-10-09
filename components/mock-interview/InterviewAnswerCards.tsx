'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react'
import type { MockInterviewRun } from '@/types/package'

type Question = MockInterviewRun['questions'][number]
export function InterviewAnswerCards({ run, renderAnswer }: { run: MockInterviewRun; renderAnswer?: (question: Question) => ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const question = run.questions.find(q => q.id === selectedId)
  useEffect(() => { if (selectedId) heading.current?.focus() }, [selectedId])
  if (question) return <section className="space-y-4" aria-label="Answer detail">
    <button type="button" className="inline-flex min-h-11 items-center gap-2 text-teal hover:underline" onClick={() => setSelectedId(null)}><ArrowLeft size={17} aria-hidden="true" />All question cards</button>
    <h3 ref={heading} tabIndex={-1} className="type-card outline-none">{question.question}</h3>
    {renderAnswer ? renderAnswer(question) : <div className="space-y-4">
      {[{ title: 'Your answer', body: question.answer || 'This question was not answered.' }, { title: 'What worked · What to improve', body: question.feedback }, { title: 'A stronger answer to practise', body: question.better_answer }, { title: 'Try this follow-up', body: question.follow_up }].filter(block => block.body).map(block => <article key={block.title} className="ui-card rounded-card border border-line bg-white p-4"><h4 className="type-card">{block.title}</h4><p className="mt-3 whitespace-pre-wrap text-ink-soft">{block.body}</p></article>)}
    </div>}
  </section>
  return <section className="space-y-3" aria-label="Question cards">
    <p className="text-sm text-ink-muted">Choose one question to explore your answer and feedback.</p>
    <div className="grid gap-3 sm:grid-cols-2">{run.questions.map((q, index) => <button key={q.id} type="button" onClick={() => setSelectedId(q.id)} className="group min-w-0 rounded-xl border border-line bg-white p-4 text-left transition-colors hover:border-teal hover:bg-teal-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
      <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm text-teal"><MessageSquare size={17} aria-hidden="true" />Question {index + 1}</span><span className="rounded-full bg-canvas px-2 py-1 text-xs text-ink-muted">{typeof q.score === 'number' ? `${q.score}/10` : q.answer ? 'Answered' : 'Skipped'}</span></span>
      <span className="mt-3 block line-clamp-3 type-body text-ink">{q.question}</span><span className="mt-4 flex items-center justify-between text-sm text-teal">Explore answer<ChevronRight size={17} aria-hidden="true" /></span>
    </button>)}</div>
  </section>
}
