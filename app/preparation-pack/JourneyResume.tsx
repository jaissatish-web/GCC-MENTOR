'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import GulfPremium from '@/components/templates/GulfPremium'
import { buildCareerProfileResume } from '@/lib/careerProfileResume'
import { makeQualitySample } from '@/lib/resumeQualitySamples'
import s from './explorer.module.css'
const SAMPLE_INDEX = [1,0,2,3,1,1,5,4,19,12,8,10,15,17,16,18]
/** Real resume renderer with clearly fictional data, not a drawn placeholder. */
export function JourneyResume({ profession, role, focus }: { profession: number; role: string; focus: string }) {
 const frame = useRef<HTMLDivElement>(null)
 const [scale, setScale] = useState(0.36)
 useEffect(()=>{const el=frame.current;if(!el)return;const measure=()=>setScale(Math.min(.36,el.clientWidth/794));measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[])
 const { profile, document } = useMemo(()=>{
  const profile = makeQualitySample(SAMPLE_INDEX[profession],1,2)
  const base = buildCareerProfileResume(profile)
  return {profile,document:{...base,header:{...base.header,displayName:'Example Candidate',targetJobTitle:`${role} · ${focus}`,showPhoto:false},summary:`${role} with experience in ${profile.skills.map(skill=>skill.name).join(', ').toLowerCase()}. Illustrative application focused on ${focus.toLowerCase()}.`}}
 },[profession,role,focus])
 return <div className={s.resumeFrame} ref={frame} style={{height:1123*scale}} aria-label={`Fictional sample resume for ${role}, ${focus}`}><div style={{width:794,zoom:scale}}><GulfPremium document={document} profile={profile} optimizedContent={{summary:{generated:'',source_profile_summary:''},experience_blocks:[]}}/></div></div>
}
