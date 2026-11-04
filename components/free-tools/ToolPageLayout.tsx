import Link from 'next/link'
import {ArrowUpRight} from 'lucide-react'
import {TOOLS,UPDATED,getContent,isActive} from '@/lib/free-tools/registry'
import {ToolCta} from './ToolCta'
import s from './PremiumTools.module.css'
type Tool=typeof TOOLS[number]
export function ToolPageLayout({tool,children,structured,introduction}:{tool:Tool;children:React.ReactNode;structured:unknown;introduction?:string}){
  const content=getContent(tool.id)
  const related=TOOLS.filter(t=>t.id!==tool.id&&isActive(t.id)).sort((a,b)=>Number(b.category===tool.category)-Number(a.category===tool.category)).slice(0,4)
  return <main id="tools-main" className={s.main} data-tool-design="v1"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/><nav aria-label="Breadcrumb"><ol className={s.breadcrumbs}><li><Link prefetch={false} href="/">Home</Link></li><li aria-hidden="true">/</li><li><Link prefetch={false} href="/tools">Free Tools</Link></li><li aria-hidden="true">/</li><li aria-current="page">{tool.name}</li></ol></nav><header className={s.hero}><p className={`${s.eyebrow} type-helper`}>{tool.category} tools · Free to use · No signup required</p><h1>{tool.name}</h1><p className={s.muted}>{introduction??content?.description}</p><p className={`${s.small} type-helper`}>Content updated <time dateTime={UPDATED}>3 November 2026</time></p></header>{children}
    {content&&<div className={s.reading}><section><h2>What this tool does</h2><p>{content.description}</p></section><section><h2>How it works</h2><p>{content.how}</p></section><section><h2>Worked example</h2><p>{content.example}</p></section><section><h2>Common mistakes</h2><p>{content.mistakes}</p></section><section><h2>Important limitations</h2><p>{content.limitations}</p><p className="type-helper">Your inputs are processed in your browser. Copy or export anything you need before leaving.</p></section><section><h2>Frequently asked questions</h2>{content.faq.map(({q,a})=><details className={s.faq} key={q}><summary>{q}</summary><p>{a}</p></details>)}</section></div>}
    <section className={s.section}><h2>Related free tools</h2><div className={s.catalog}>{related.map(t=><Link prefetch={false} className={s.toolCard} href={`/tools/${t.slug}`} key={t.id}><div><h3 className="type-card">{t.name}</h3><p className="type-helper">{getContent(t.id)?.description.split('. ')[0]}.</p></div><ArrowUpRight size={18} aria-hidden="true"/></Link>)}</div></section><ToolCta slug={tool.slug} category={tool.category}/></main>
}
