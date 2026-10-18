export const JOBS = [
  { title: 'Instrument Engineer', letters: 2, sets: 3, sessions: 4, description: 'Maintain instrumentation, carry out calibration and support safe plant operation.' },
  { title: 'Maintenance Engineer', letters: 3, sets: 4, sessions: 6, description: 'Plan preventive maintenance, troubleshoot instrumentation faults and improve equipment reliability.' },
  { title: 'Commissioning Lead', letters: 2, sets: 3, sessions: 5, description: 'Coordinate loop checks, functional testing and commissioning handover.' },
] as const
export type Service = 'cv' | 'letters' | 'qa' | 'mock'
export const SERVICES: Array<{ key: Service; title: string; detail: string }> = [
  { key: 'cv', title: 'Optimized CV', detail: 'Review your job-matched CV, choose a template, save and download.' },
  { key: 'letters', title: 'Cover letters', detail: 'Explore multiple tailored versions for this opening.' },
  { key: 'qa', title: 'Interview Q&A', detail: 'Prepare with Gulf-standard, role-specific Q&A based on your profile and job description. Be ready for questions you may be asked.' },
  { key: 'mock', title: 'Mock interviews', detail: 'Practise, review feedback and repeat to strengthen your answers and confidence.' },
]
