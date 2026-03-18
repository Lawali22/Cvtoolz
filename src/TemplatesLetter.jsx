import React from "react";

function fullName(cv) {
  return cv.nameOrder === "lastFirst"
    ? (cv.lastName + " " + cv.firstName).trim()
    : (cv.firstName + " " + cv.lastName).trim();
}

function LetterHeader({ cv, accent }) {
  const loc = (cv.location || cv.nationality || "").toLowerCase();
  let devise = "La Patrie ou la Mort, nous vaincrons !";
  let pays   = "BURKINA FASO";
  if (loc.includes("mali"))    { devise = "Un Peuple · Un But · Une Foi"; pays = "MALI"; }
  else if (loc.includes("niger"))   { devise = "Fraternité · Travail · Progrès"; pays = "NIGER"; }
  else if (loc.includes("sénégal")||loc.includes("senegal")) { devise = "Un Peuple · Un But · Une Foi"; pays = "SÉNÉGAL"; }
  else if (loc.includes("côte")||loc.includes("ivoire"))  { devise = "Union · Discipline · Travail"; pays = "CÔTE D\'IVOIRE"; }
  else if (loc.includes("togo"))    { devise = "Travail · Liberté · Patrie"; pays = "TOGO"; }
  else if (loc.includes("bénin")||loc.includes("benin"))  { devise = "Fraternité · Justice · Travail"; pays = "BÉNIN"; }
  else if (loc.includes("cameroun"))  { devise = "Paix · Travail · Patrie"; pays = "CAMEROUN"; }
  else if (loc.includes("guinée")||loc.includes("guinee"))  { devise = "Travail · Justice · Solidarité"; pays = "GUINÉE"; }
  else if (loc.includes("congo"))   { devise = "Unité · Travail · Progrès"; pays = "CONGO"; }
  if (cv.letterCountry?.trim()) pays   = cv.letterCountry.trim().toUpperCase();
  if (cv.letterDevise?.trim())  devise = cv.letterDevise.trim();
  const name = fullName(cv);
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{ fontSize:11, lineHeight:1.9, maxWidth:"46%" }}>
        <div style={{ fontWeight:700, fontSize:12 }}>{name}</div>
        {cv.title && <div style={{ color:accent, fontSize:10.5 }}>{cv.title}</div>}
        {cv.location && <div>{cv.location}</div>}
        {cv.phone  && <div>Tél : {cv.phone}</div>}
        {cv.phone2 && <div>{cv.phone2}</div>}
        {cv.email  && <div>E-mail : <span style={{ color:accent }}>{cv.email}</span></div>}
      </div>
      <div style={{ textAlign:"center", fontSize:11 }}>
        <div style={{ fontWeight:800, fontSize:12, letterSpacing:1.5 }}>{pays}</div>
        <div style={{ borderTop:`1px solid ${accent}`, borderBottom:`1px solid ${accent}`, padding:"3px 0", marginTop:3 }}>
          {devise.split("·").map((d,i,arr)=>(
            <span key={i} style={{ fontSize:10.5 }}>{d.trim()}{i<arr.length-1&&<span style={{ margin:"0 5px", color:accent }}>·</span>}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LetterTail({ cv, accent }) {
  const hasSig = cv.signatureCity || cv.signatureDate;
  return (
    <div>
      {cv.letterSubject && (
        <div style={{ marginBottom:20, fontSize:11.5 }}>
          <span style={{ fontWeight:700 }}>Objet : </span>
          <span style={{ textDecoration:"underline" }}>{cv.letterSubject}</span>
        </div>
      )}
      <div style={{ whiteSpace:"pre-wrap", textAlign:"justify", fontSize:11.5, lineHeight:1.85 }}>
        {cv.letter}
      </div>
      <div style={{ marginTop:32, textAlign:"right" }}>
        {hasSig && (
          <div style={{ fontSize:10.5, color:"#666", marginBottom:8 }}>
            {[cv.signatureCity, cv.signatureDate].filter(Boolean).join(", le ")}
          </div>
        )}
        {cv.signature
          ? <img src={cv.signature} alt="Signature" style={{ height:54, display:"block", marginLeft:"auto", marginBottom:4 }}/>
          : <div style={{ height:44 }}/>}
      </div>
    </div>
  );
}

function RecipientBlock({ cv }) {
  return cv.letterRecipient ? (
    <div style={{ textAlign:"right", marginBottom:20, fontSize:11, lineHeight:1.9 }}>
      <div style={{ fontWeight:600 }}>A</div>
      <div>{cv.letterRecipient}</div>
    </div>
  ) : null;
}

function DateBlock({ cv }) {
  const hasSig = cv.signatureCity || cv.signatureDate;
  return hasSig ? (
    <div style={{ textAlign:"right", fontSize:11, marginBottom:16, color:"#666" }}>
      {[cv.signatureCity, cv.signatureDate].filter(Boolean).join(", le ")}
    </div>
  ) : null;
}

function LetterRenderer({ cv }) {
  const tpl    = LETTER_TEMPLATES.find(t => t.id === (cv.letterTemplate||"ltr-classique")) || LETTER_TEMPLATES[0];
  const accent = cv.accentColor || tpl.accent;

  if (tpl.id === "ltr-classique") return (
    <div style={{ background:"#fff", fontFamily:"'Georgia',serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:2, background:`linear-gradient(90deg,${accent},${accent}20)`, margin:"24px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-elegante") return (
    <div style={{ background:"#fffef8", fontFamily:"'Palatino Linotype',serif", fontSize:11.5, color:"#1a1208",
      padding:"48px 56px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:9, letterSpacing:6, textTransform:"uppercase", color:accent }}>Lettre de motivation</div>
        <div style={{ width:60, height:1.5, background:accent, margin:"6px auto" }}/>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:accent+"40", margin:"22px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-moderne") return (
    <div style={{ background:"#fff", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"0 0 40px", minHeight:780, lineHeight:1.8 }}>
      <div style={{ background:accent, padding:"22px 48px", marginBottom:28 }}>
        <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11, marginTop:2 }}>{cv.title}</div>}
        <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, marginTop:5 }}>
          {[cv.phone, cv.email, cv.location].filter(Boolean).join("   ·   ")}
        </div>
      </div>
      <div style={{ padding:"0 48px" }}>
        <LetterHeader cv={cv} accent={accent}/>
        <div style={{ height:1, background:"#eee", margin:"20px 0" }}/>
        <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
        <LetterTail cv={cv} accent={accent}/>
      </div>
    </div>
  );
  if (tpl.id === "lettre-creative") return (
    <div style={{ background:"#fff", fontFamily:"'Helvetica Neue',sans-serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.8 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:800, color:accent, letterSpacing:"-0.5px" }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#bbb", marginTop:4 }}>{[cv.phone, cv.email].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ height:4, background:`linear-gradient(90deg,${accent},#f9a8d4,${accent}40)`, borderRadius:99, marginBottom:24 }}/>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:"#f0f0f0", margin:"20px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-executive") return (
    <div style={{ background:"#fffef8", fontFamily:"'Times New Roman',serif", fontSize:11.5, color:"#1a1208",
      padding:"48px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ borderBottom:`2.5px double ${accent}`, paddingBottom:16, marginBottom:28 }}>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-tech") return (
    <div style={{ background:"#f8fafc", fontFamily:"'Courier New',monospace", fontSize:11, color:"#0f172a",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ borderLeft:`3px solid ${accent}`, paddingLeft:16, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:13, color:accent }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:10.5, color:"#64748b", marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>{[cv.phone, cv.email].filter(Boolean).join(" | ")}</div>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ margin:"16px 0", fontSize:9, color:accent }}>{"/* Lettre de motivation */"}</div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-sante") return (
    <div style={{ background:"#f0fdf4", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ background:"#fff", border:`1.5px solid ${accent}30`, borderRadius:8, padding:"16px 20px", marginBottom:24 }}>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-juridique") return (
    <div style={{ background:"#faf5ff", fontFamily:"'Times New Roman',serif", fontSize:11.5, color:"#111",
      padding:"48px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <div style={{ textAlign:"center", borderBottom:`1.5px solid ${accent}`, paddingBottom:14, marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ color:accent, fontSize:11, marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#888", marginTop:5 }}>{[cv.phone, cv.email, cv.location].filter(Boolean).join("   |   ")}</div>
      </div>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:accent+"30", margin:"18px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-academique") return (
    <div style={{ background:"#fff7ed", fontFamily:"'Georgia',serif", fontSize:11.5, color:"#111",
      padding:"44px 52px 40px", minHeight:780, lineHeight:1.9 }}>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ borderTop:`2px solid ${accent}`, borderBottom:`1px solid ${accent}40`, padding:"6px 0", margin:"20px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  if (tpl.id === "lettre-minimaliste") return (
    <div style={{ background:"#f9fafb", fontFamily:"'Helvetica Neue',sans-serif", fontSize:11.5, color:"#111",
      padding:"52px 60px 40px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:300, letterSpacing:3, textTransform:"uppercase" }}>{fullName(cv)}</div>
        <div style={{ fontSize:10, color:"#9ca3af", letterSpacing:1, marginTop:4 }}>{[cv.phone, cv.email, cv.location].filter(Boolean).join("   ")}</div>
      </div>
      <div style={{ height:1, background:"#e5e7eb", marginBottom:24 }}/>
      <LetterHeader cv={cv} accent={accent}/>
      <div style={{ height:1, background:"#e5e7eb", margin:"18px 0" }}/>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
  // ATS — tous les modèles ATS (structure identique, accent variable)
  return (
    <div style={{ background:"#fff", fontFamily:"'Arial',sans-serif", fontSize:11.5, color:"#111",
      padding:"38px 44px 36px", minHeight:780, lineHeight:1.85 }}>
      <div style={{ borderBottom:`2px solid ${accent}`, paddingBottom:14, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{fullName(cv)}</div>
        {cv.title && <div style={{ fontSize:11, color:accent, marginTop:2 }}>{cv.title}</div>}
        <div style={{ fontSize:10, color:"#555", marginTop:6, lineHeight:1.9 }}>
          {cv.location && <div>{cv.location}</div>}
          {cv.phone && <div>Tél : {cv.phone}{cv.phone2?" / "+cv.phone2:""}</div>}
          {cv.email && <div>Email : {cv.email}</div>}
        </div>
        <LetterHeader cv={cv} accent={accent}/>
      </div>
      <DateBlock cv={cv}/><RecipientBlock cv={cv}/>
      <LetterTail cv={cv} accent={accent}/>
    </div>
  );
}


/* ─── CV RENDERERS ─── */
const Sec = ({ t, a, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:8.5, fontWeight:800, textTransform:"uppercase", letterSpacing:"3.5px",
      color:a, borderBottom:`1.5px solid ${a}35`, paddingBottom:4, marginBottom:9 }}>{t}</div>
    {children}
  </div>
);
const ExpBlk = ({ e, a }) => (
  <div style={{ marginBottom:11 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <strong style={{ fontSize:11.5 }}>{e.role}</strong>
      <span style={{ fontSize:9.5, color:"#999" }}>{e.start}–{e.current?"Présent":e.end}</span>
    </div>
    <div style={{ fontSize:10.5, color:a, marginBottom:2 }}>{e.company}</div>
    <p style={{ fontSize:10.5, color:"#555", lineHeight:1.6, margin:0 }}>{e.description}</p>
  </div>
);
const EduBlk = ({ e }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <strong style={{ fontSize:11.5 }}>{e.degree} {e.field}</strong>
      <span style={{ fontSize:9.5, color:"#999" }}>{e.start}–{e.end}</span>
    </div>
    <div style={{ fontSize:10.5, color:"#999" }}>{e.school}</div>
  </div>
);


export { LetterHeader, LetterTail, RecipientBlock, DateBlock, LetterRenderer };
