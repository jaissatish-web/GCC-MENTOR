import {ToolHeader,ToolFooter} from '@/components/free-tools/ToolChrome'
import s from '@/components/free-tools/Tools.module.css'
export default function ToolsLayout({children}:{children:React.ReactNode}){return <div className={`${s.shell} premium-tools-scope`}><a className={s.skip} href="#tools-main">Skip to tool</a><ToolHeader/>{children}<ToolFooter/></div>}
