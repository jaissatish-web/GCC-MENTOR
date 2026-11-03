'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import {toolEvent} from './events'
import s from './Tools.module.css'
export function ToolCta({slug,category='Career',compact=false}:{slug:string;category?:string;compact?:boolean}) {
  const [member,setMember]=useState(false),ref=useRef<HTMLElement>(null)
  useEffect(()=>{
    let alive=true
    if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      void import('@/lib/supabase/client').then(({createClient})=>createClient().auth.getUser()).then(({data})=>{if(alive)setMember(Boolean(data.user))}).catch(()=>{})
    }
    return()=>{alive=false}
  },[])
  useEffect(()=>{
    const el=ref.current;if(!el)return
    if(!('IntersectionObserver' in window)){toolEvent(slug,'cta_impression');return}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){toolEvent(slug,'cta_impression');observer.disconnect()}},{threshold:.3});observer.observe(el);return()=>observer.disconnect()
  },[slug])
  const interview=category==='Career'&&slug.includes('interview')
  const title=category==='Resume'?'Give your next application a stronger foundation.':interview?'Practise for your next interview.':'Planning your next Gulf career move?'
  const href=member?(interview?'/mock-interview':category==='Resume'||category==='Finance'?'/optimize/target':'/dashboard'):'/signup'
  const label=member?(interview?'Prepare for Interview':category==='Resume'||category==='Finance'?'Optimize Resume for a New Job':'Open Career Dashboard'):'Create Free Career Profile'
  return <section ref={ref} className={s.cta} aria-label={compact?'Continue your career preparation':'Optional career preparation'}><div><h2>{compact?'Ready for your next step?':title}</h2>{!compact&&<p>Create a Career Profile from your real experience, then prepare job-specific resumes, cover letters and interview answers. Free tools remain available without an account.</p>}</div><Link prefetch={false} className={s.button} href={href} onClick={()=>toolEvent(slug,'cta_click')}>{label}</Link></section>
}
