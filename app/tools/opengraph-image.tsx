import {ImageResponse} from 'next/og'
export const alt='GCC Mentor — Free Career Tools'
export const size={width:1200,height:630}
export const contentType='image/png'
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',background:'#f7f9fc',padding:70,color:'#18253a'}}><div style={{display:'flex',fontSize:27,color:'#2563eb',marginBottom:35}}>GCC MENTOR</div><div style={{display:'flex',fontSize:64,fontWeight:700,marginBottom:28}}>Free career tools</div><div style={{display:'flex',fontSize:30,maxWidth:1000,lineHeight:1.5}}>Resume checks · Salary calculators · Career planning</div><div style={{display:'flex',fontSize:24,marginTop:40,color:'#53637a'}}>Useful results. No signup required.</div></div>,size)}
