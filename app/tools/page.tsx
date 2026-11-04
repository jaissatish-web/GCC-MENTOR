import type {Metadata} from 'next'
import Link from 'next/link'
import {ToolCatalog} from '@/components/free-tools/ToolCatalog'
import {ToolCta} from '@/components/free-tools/ToolCta'
import {SITE_URL} from '@/lib/siteUrl'
import s from '@/components/free-tools/PremiumTools.module.css'
const title='Free Career Tools | Resume, Salary & Job Search Utilities'
const description='Explore free resume checks, salary calculators, career planners and employment tools. Use complete results in your browser without registration or AI calls.'
export const metadata:Metadata={title:{absolute:`${title} — GCC Mentor`},description,alternates:{canonical:`${SITE_URL}/tools`},openGraph:{title,description,url:`${SITE_URL}/tools`,type:'website',locale:'en_US',images:[{url:`${SITE_URL}/tools/opengraph-image`,width:1200,height:630,alt:'GCC Mentor free career tools'}]},twitter:{card:'summary_large_image',title,description,images:[`${SITE_URL}/tools/opengraph-image`]},robots:{index:true,follow:true}}
export default function ToolsPage(){
  return <main id="tools-main" className={s.main} data-tool-design="v1">
    <ol className={s.breadcrumbs} aria-label="Breadcrumb"><li><Link prefetch={false} href="/">Home</Link></li><li aria-hidden="true">/</li><li aria-current="page">Free Tools</li></ol>
    <header className={s.hero}><h1>Free Career Tools</h1><p className={s.muted}>Practical resume checks, calculators and planners. Clear results, free to use, with no signup.</p></header>
    <section aria-label="Browse free tools"><ToolCatalog/></section>
    <section className={`${s.section} ${s.reading}`}><h2>Simple tools, transparent limits</h2><p>Each tool explains its method and limitations. Resume checks use text rules rather than an employer’s ATS; financial comparisons use your figures rather than live market data.</p><p>Employment tools remain unavailable until their country-specific rules are verified. Check the coverage and assumptions shown on each page.</p></section>
    <ToolCta slug="directory"/>
  </main>
}
