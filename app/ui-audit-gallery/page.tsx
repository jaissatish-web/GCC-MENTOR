import { notFound } from 'next/navigation'
export const metadata = { robots: { index: false, follow: false } }
export default async function Gallery({searchParams}:{searchParams:Promise<{width?:string;page?:string}>}) {
 const p=await searchParams
 const width=['320','390','768','1280'].includes(p.width??'')?Number(p.width):390
 const src=p.page==='landing'?'/':'/ui-audit'
 if (process.env.VERCEL_ENV === 'production') notFound()
  return <main style={{padding:24,background:'#e9e8e5'}}><h1 style={{fontSize:20,marginBottom:16}}>Local typography QA — {width}px · {src==='/'?'Landing':'App components'}</h1><iframe title="Responsive typography preview" src={src} style={{width,height:840,border:'1px solid #bbb',background:'#fff',display:'block'}} /></main>
}
