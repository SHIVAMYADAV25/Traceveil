/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Poppins } from "next/font/google";
import { DISCORD_URL } from "@/content/support/own-spaces";
import "./home.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
});

export default function Home() {
  return (
    <div className={poppins.variable}>
<main className="tv-p">
<div className="tv-w tv-nav">
<div style={{display:'flex',alignItems:'center',gap:'10px'}}><svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3 4 8v7c0 6 4.5 10 11 12 6.5-2 11-6 11-12V8z" fill="#E4937A"/><path d="M10 15l4 4 7-8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round"/></svg><b style={{fontSize:'22px',fontWeight:'500'}}>traceveil</b></div>
<div><a className="tv-l" href="#what">What it is</a><a className="tv-l" href="#who">Who it’s for</a><a className="tv-l" href="#how">How it works</a><a className="tv-l" href="#support">Support</a><a className="tv-l" href="#community">Community</a><a className="tv-l" href="#faq">FAQ</a><a className="tv-pill tv-dk" href="#how" style={{minHeight:'42px'}}>Get help →</a></div>
</div>

<section className="tv-w tv-sec" style={{paddingTop:'96px'}}>
<div className="tv-row">
<div>
<span className="tv-chip">You’re not alone</span>
<h1 style={{marginTop:'18px'}}>Get your private media<br /><span className="tv-co">removed from the internet.</span></h1>
<p className="tv-mu" style={{margin:'20px 0 28px',maxWidth:'480px'}}>Traceveil helps you find where your images/videos are, send removal requests, and reach people who will listen. One calm place, at your pace.</p>
<a className="tv-pill tv-dk" href="#how">Get help →</a> <a className="tv-pill tv-lt" href="#what">See what Traceveil is</a>
</div>
<img className="tv-img" src="/landing/hero.webp" width="1100" height="716" alt="Four people of different genders and backgrounds looking ahead together" />
</div>
<div className="tv-g tv-g3" style={{marginTop:'146px'}}>
<a href="#what" className="tv-card tv-pk" style={{textDecoration:'none',color:'inherit'}}><h3>What is Traceveil?</h3><p className="tv-mu" style={{fontSize:'14px'}}>Learn more ↓</p></a>
<a href="#who" className="tv-card tv-mn" style={{textDecoration:'none',color:'inherit'}}><h3>Who is it for?</h3><p className="tv-mu" style={{fontSize:'14px'}}>Learn more ↓</p></a>
<a href="#how" className="tv-card tv-bl" style={{textDecoration:'none',color:'inherit'}}><h3>How do I use it?</h3><p className="tv-mu" style={{fontSize:'14px'}}>Learn more ↓</p></a>
</div>
</section>

<section id="what" className="tv-w tv-sec"><div className="tv-row">
<img className="tv-img" src="/landing/laptop.webp" width="800" height="478" alt="Person quietly working on a laptop" />
<div><h2>What is <b>Traceveil</b>?</h2>
<p className="tv-mu" style={{margin:'18px 0'}}>Traceveil is a free support platform for people whose private images or videos were shared, without consent. Check where your content appears, get ready-to-send removal requests, and find real people to talk to.</p>
<div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}><span className="tv-chip">Find your content</span><span className="tv-chip">Get it taken down</span><span className="tv-chip">Talk to someone</span><span className="tv-chip">Join a community</span></div></div>
</div></section>

<section id="who" className="tv-w tv-sec" style={{background:'#F6F1E7',maxWidth:'none' ,padding: "200px 0px"}}><div className="tv-w" style={{padding:'0 28px'}}>
<h2 style={{textAlign:'center'}}>Who is <b>Traceveil</b> for?</h2>
<p className="tv-mu" style={{textAlign:'center',margin:'14px auto 36px',maxWidth:'620px'}}>For anyone. Any gender, any age, any background. No one is judged here.</p>
<div className="tv-g tv-g3">
<div className="tv-card tv-pk"><h3>You’re affected</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>Your images were shared or leaked without your consent.</p></div>
{/* <div className="tv-card tv-mn"><h3>You’re being threatened</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>Someone says they will share your images, or demands something.</p></div> */}
<div className="tv-card tv-bl"><h3>You’re helping someone</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>A friend or family member needs support and you want to do it right.</p></div>
<div className="tv-card tv-or"><h3>You’re not sure</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>You think something is out there but don’t know. We can help you find out.</p></div>
</div></div></section>

<section id="how" className="tv-w tv-sec" style={{paddingTop:"199px"}}>
<h2 style={{textAlign:'center'}}>How to use <b>Traceveil</b></h2>
<p className="tv-mu" style={{textAlign:'center',margin:'14px 0 36px'}}>Three simple steps. Stop whenever you want.</p>
<div className="tv-g tv-g3">
<div className="tv-card"><div className="tv-num">1</div><h3>Tell us what you need</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>Check for your content, get a removal plan, or just talk to someone first.</p></div>
<div className="tv-card"><div className="tv-num">2</div><h3>Get clear next steps</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>See what we found in plain language and what each option means.</p></div>
<div className="tv-card"><div className="tv-num">3</div><h3>Act at your own pace</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'8px'}}>Send removal requests, contact helplines, or return to the community any time.</p></div>
</div></section>

<section className="tv-w tv-sec" style={{paddingTop:"199px"}}><div className="tv-card tv-mn" style={{padding:'48px'}}><div className="tv-row">
<div><h2>Your privacy <b>comes first</b></h2>
<p className="tv-mu" style={{margin:'16px 0 24px'}}>This is a sensitive moment. Here is what we promise.</p>
<div className="tv-tick"><i>✓</i><span>No account or email needed to get help</span></div>
<div className="tv-tick"><i>✓</i><span>Your images are not stored</span></div>
<div className="tv-tick"><i>✓</i><span>The community is anonymous and text-only</span></div>
<div className="tv-tick"><i>✓</i><span>You stay in control at every step</span></div></div>
<img className="tv-img" src="/landing/privacy-Photoroom.png" width="900" height="600" alt="Person holding a shield with a lock" />
</div></div></section>

<section className="tv-w tv-sec" style={{paddingTop:"199px"}}><div className="tv-row">
<div><span className="tv-chip">Get it taken down</span><h2 style={{marginTop:'14px'}}>Find it. Report it. <b>Track it.</b></h2>
<p className="tv-mu" style={{margin:'16px 0 24px'}}>Upload one image to see where it may appear. Traceveil prepares removal requests for each platform and a clear record you can use with the police or a lawyer.</p>
<Link className="tv-pill tv-dk" href="/leak">Start a check →</Link></div>
<img className="tv-img" src="/landing/doc.webp" width="800" height="477" alt="Person reading a prepared removal request" />
</div></section>

<section id="support" className="tv-w tv-sec" style={{paddingTop:"199px"}}><div className="tv-card tv-bl" style={{padding:'48px'}}><div className="tv-row">
<img className="tv-img" src="/landing/calm-removebg-preview.png" width="800" height="477" alt="Person listening to calming audio with a warm drink" />
<div><span className="tv-chip" style={{background:'#fff',color:'#2E4A7A'}}>Talk to someone</span><h2 style={{marginTop:'14px'}}>Counsellors and helplines, <b>free</b></h2>
<p className="tv-mu" style={{margin:'16px 0 18px'}}>Trained people who won’t judge. Pick one and reach out whenever you’re ready.</p>
<div className="tv-tick"><i>✓</i><span><b>Tele-MANAS 14416</b>: free, 24/7 mental health support</span></div>
<div className="tv-tick"><i>✓</i><span>iCall, Vandrevala Foundation, AASRA and more, with hours</span></div>
<Link className="tv-lk" href="/support/counsellors" style={{color:'#2E4A7A'}}>See all helplines →</Link></div>
</div></div></section>

<section id="community" className="tv-w tv-sec" style={{paddingTop:"199px"}}>
<div className="tv-row"><div><span className="tv-chip">More than a tool</span><h2 style={{marginTop:'14px'}}>Community, <b>stories and calm</b></h2>
<p className="tv-mu" style={{margin:'16px 0 24px'}}>Meet people who understand, in moderated rooms or on our Discord. Join with a nickname, no email and no private messages.</p>
<Link className="tv-pill tv-dk" href="/community">Join the community</Link> <a className="tv-pill tv-lt" href={DISCORD_URL ?? "/community"}>Open Discord</a></div>
<img className="tv-img" src="/landing/support.webp" width="1100" height="656" alt="Person on a bean bag with a cat, surrounded by support options" /></div>
<div className="tv-g tv-g3" style={{marginTop:'40px'}}>
<div className="tv-card tv-pk"><span className="tv-chip" style={{background:'#fff'}}>Community</span><h3 style={{marginTop:'12px'}}>You’re not alone</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'6px'}}>Safe, moderated rooms with a two-tap report.</p></div>
<div className="tv-card tv-or"><span className="tv-chip" style={{background:'#fff'}}>Books &amp; stories</span><h3 style={{marginTop:'12px'}}>Learn and feel supported</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'6px'}}>Guides, real stories and practical advice.</p></div>
<div className="tv-card tv-mn"><span className="tv-chip" style={{background:'#fff'}}>Music &amp; audio</span><h3 style={{marginTop:'12px'}}>A moment of calm</h3><p className="tv-mu" style={{fontSize:'14px',marginTop:'6px'}}>Playlists and soft audio for hard days.</p></div>
</div></section>

<section className="tv-w tv-sec" style={{paddingTop:"199px"}}>
<h2 style={{textAlign:'center'}}>Organisations that <b>help</b></h2>
<p className="tv-mu" style={{textAlign:'center',margin:'14px 0 36px'}}>Trusted NGOs and official services. Contact them directly.</p>
<div className="tv-g tv-g4">
<div className="tv-card"><h3>Meri Trustline</h3><p className="tv-mu" style={{fontSize:'14px',margin:'8px 0'}}>RATI Foundation. Free, confidential help with takedown, counselling and legal guidance by phone or WhatsApp.</p><b>6363176363</b></div>
<div className="tv-card"><h3>StopNCII.org</h3><p className="tv-mu" style={{fontSize:'14px',margin:'8px 0'}}>Free tool for adults (18+) to stop intimate images spreading on partner platforms.</p><a className="tv-lk" href="https://stopncii.org" target="_blank" rel="noopener noreferrer">stopncii.org</a></div>
<div className="tv-card"><h3>Cyber Wellness Helpline</h3><p className="tv-mu" style={{fontSize:'14px',margin:'8px 0'}}>Run by Responsible Netism. Support for people facing online harm.</p><Link className="tv-lk" href="/support">Contact details</Link></div>
<div className="tv-card"><h3>Cyber Crime Portal</h3><p className="tv-mu" style={{fontSize:'14px',margin:'8px 0'}}>Report online to the National Cybercrime Reporting Portal or call the helpline.</p><b>1930</b></div>
</div></section>

<section className="tv-w tv-sec" style={{paddingTop:"199px"}}><div className="tv-card tv-or" style={{padding:'40px 48px'}}><div className="tv-row" style={{gridTemplateColumns:'1fr 1fr'}}>
<div><h2>You don’t have to figure this out <b>alone</b></h2><p className="tv-mu" style={{margin:'14px 0 22px'}}>Take the next step at your own pace.</p><a className="tv-pill tv-dk" href="#how">Get help →</a></div>
<img className="tv-img" src="/landing/group-Photoroom.png" width="1300" height="542" alt="Four people standing together with a heart" />
</div></div></section>

<section className="tv-w" style={{paddingBottom:'56px'}}><div className="tv-card tv-pk" style={{padding:'28px 32px',display:'flex',gap:'24px',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
<div><h3>Are you under 18?</h3><p className="tv-mu" style={{fontSize:'15px',marginTop:'6px'}}>Call Childline <b>1098</b> any time. You can also use <b>Take It Down</b>, a free service by NCMEC for images taken before you were 18.</p></div>
<a className="tv-pill tv-lt" href="https://takeitdown.ncmec.org" target="_blank" rel="noopener noreferrer">Visit Take It Down</a>
</div></section>

<section id="faq" className="tv-w tv-sec">
<h2 style={{textAlign:'center'}}>Frequently asked <b>questions</b></h2>
<div className="tv-g tv-g2" style={{marginTop:'32px',alignItems:'start'}}>
<details><summary>Is Traceveil free?</summary><p>Yes. Getting help, the community and the helpline directory are free.</p></details>
<details><summary>Will my images be stored?</summary><p>No. Your images are not stored.</p></details>
<details><summary>Can I use it regardless of my gender?</summary><p>Yes. Traceveil is for everyone, any gender and any age.</p></details>
<details><summary>Does Traceveil guarantee removal?</summary><p>No one can promise that. We prepare the requests and guide you; platforms decide.</p></details>
<details><summary>Do I need an account?</summary><p>No. The community uses a nickname only.</p></details>
<details><summary>What if nothing is found?</summary><p>You can still talk to someone, join the community, or set up protection.</p></details>
</div></section>

<footer style={{borderTop:'1px solid #EADFD2',padding:'32px 0'}}><div className="tv-w" style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'16px',fontSize:'14px',color:'#565B66'}}><span><b style={{color:'#1F2430',fontWeight:'500'}}>traceveil</b> · Get help. Take back control.</span><span>Privacy · Terms · <Link href="/support" style={{color:'inherit'}}>Support</Link> · <Link href="/community" style={{color:'inherit'}}>Community</Link> · <a href="#faq" style={{color:'inherit'}}>FAQ</a></span></div></footer>
</main>
    </div>
  );
}
