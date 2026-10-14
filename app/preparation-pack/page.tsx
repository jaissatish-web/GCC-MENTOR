import type { Metadata } from 'next'
import { PreparationExplorer } from './PreparationExplorer'
export const metadata: Metadata = {
 title: 'Explore Your Gulf Career Preparation Pack | GCC Mentor',
 description: 'Explore profession-specific Gulf application preparation: one Career Profile, different job descriptions, tailored resumes, cover letters and interview practice.',
 alternates: { canonical: '/preparation-pack' },
}
export default function PreparationPackPage() { return <PreparationExplorer /> }
