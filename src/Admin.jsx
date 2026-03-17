import React, { useState, useEffect } from "react";

// Récupérer depuis window (injecté par App.jsx)
const sheetsGet      = (...a) => window.__sheetsGet(...a);
const sheetsPost     = (...a) => window.__sheetsPost(...a);
const sheetsPostResp = (...a) => window.__sheetsPostResp(...a);
const getAdminPwd    = (...a) => window.__getAdminPwd(...a);
const getAnnounce    = (...a) => window.__getAnnounce(...a);
const updateConfig   = (...a) => window.__updateConfig(...a);
const SHEETS_URL     = window.__SHEETS_URL;

/* ─── ADMIN DASHBOARD ─── */
function AdminDashboard({ onBack }) {
  const [adminTab,  setAdminTab]  = useState("candidats");
  const [candidats, setCandidats] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");

  // Codes promo — gérés par PromoTab

  // Témoignages
  const [testis,       setTestis]      = useState(DEFAULT_TESTIMONIALS);
  const [testiLoading, setTestiLoading]= useState(false);
  const [testiForm,    setTestiForm]   = useState({ name:"", role:"", text:"" });
  const [testiEdit,    setTestiEdit]   = useState(null);
  const [testiMsg,     setTestiMsg]    = useState("");

  // Paramètres
  const [pwdCurrent,  setPwdCurrent]  = useState("");
  const [pwdNew,      setPwdNew]      = useState("");
  const [pwdConfirm,  setPwdConfirm]  = useState("");
  const [pwdMsg,      setPwdMsg]      = useState("");
  const [announce,    setAnnounce]    = useState("");
  const [announceMsg, setAnnounceMsg] = useState("");

  useEffect(() => { loadData(); loadPromos(); loadTestis(); loadSettings(); }, []);

  const loadTestis = async () => {
    setTestiLoading(true);
    try { const j = await sheetsGet("getTemoignages"); if (j.data) setTestis(j.data); }
    catch(e) { console.warn("Témoignages:", e); }
    finally { setTestiLoading(false); }
  };

  const loadSettings = async () => { setAnnounce(await getAnnounce()); };

  // ── Témoignages helpers ──
  const addTesti = async () => {
    if (!testiForm.name.trim() || !testiForm.text.trim()) { setTestiMsg("⚠ Nom et texte requis."); return; }
    setTestiLoading(true);
    await sheetsPost({ action:"addTemoignage", name:testiForm.name.trim(), role:testiForm.role.trim(), text:testiForm.text.trim() });
    await loadTestis();
    setTestiForm({ name:"", role:"", text:"" });
    setTestiMsg("✓ Témoignage ajouté !"); setTimeout(() => setTestiMsg(""), 3000);
  };
  const updateTesti = async () => {
    if (!testiForm.name.trim() || !testiForm.text.trim()) return;
    setTestiLoading(true);
    await sheetsPostResp({ action:"updateTemoignage", id:testiEdit, name:testiForm.name.trim(), role:testiForm.role.trim(), text:testiForm.text.trim() });
    await loadTestis();
    setTestiEdit(null); setTestiForm({ name:"", role:"", text:"" });
    setTestiMsg("✓ Modifié !"); setTimeout(() => setTestiMsg(""), 3000);
  };
  const deleteTesti = async (id) => {
    if (!window.confirm("Supprimer ce témoignage ?")) return;
    setTestiLoading(true);
    await sheetsPostResp({ action:"deleteTemoignage", id });
    await loadTestis();
  };
  const toggleTesti = async (t) => {
    setTestiLoading(true);
    await sheetsPostResp({ action:"updateTemoignage", id:t.id, actif:!t.actif });
    await loadTestis();
  };
  const startEdit = (t) => { setTestiEdit(t.id); setTestiForm({ name:t.name, role:t.role, text:t.text }); };
  const cancelEdit = () => { setTestiEdit(null); setTestiForm({ name:"", role:"", text:"" }); };

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(SHEETS_URL + "?action=getCandidats");
      const json = await res.json();
      const rows = (json.data || []).map((r, i) => ({
        id:           i,
        prenom:       r[0] || "",
        nom:          r[1] || "",
        email:        r[2] || "",
        telephone:    r[3] || "",
        ville:        r[4] || "",
        titre:        r[5] || "",
        competences:  r[6] || "",
        mode:         r[7] || "",
        template:     r[8] || "",
        date_creation: r[9] ? String(r[9]) : "",
      })).reverse(); // plus récents en premier
      setCandidats(rows);
    } catch(e) { setError("Erreur chargement : " + e.message); }
    finally { setLoading(false); }
  };

  const loadPromos = async () => {}; // géré par PromoTab

  const csvCell = (v) => { var s = (v||"").toString().replace(/"/g, '""'); return '"' + s + '"'; };
  const exportCSV = () => {
    const rows = filtered;
    const header = ["Prénom","Nom","Email","Téléphone","Ville","Titre","Compétences","Mode","Template","Date"];
    const lines = rows.map(r => [
      r.prenom, r.nom, r.email, r.telephone, r.ville,
      r.titre, r.competences, r.mode, r.template,
      r.date_creation ? new Date(r.date_creation).toLocaleDateString("fr-FR") : ""
    ].map(v => csvCell(v)).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cvtools_candidats.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = candidats
    .filter(c => filter === "all" || c.mode === filter)
    .filter(c => !search || [c.prenom,c.nom,c.email,c.titre,c.ville].some(v =>
      (v||"").toLowerCase().includes(search.toLowerCase())
    ));

  const stats = {
    total:  candidats.length,
    cv:     candidats.filter(c=>c.mode==="cv").length,
    letter: candidats.filter(c=>c.mode==="letter").length,
    combo:  candidats.filter(c=>c.mode==="cv+letter").length,
    today:  candidats.filter(c => {
      if (!c.date_creation) return false;
      const d = new Date(c.date_creation), n = new Date();
      return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
    }).length,
  };

  const LIMIT = 400;
  const fillPct = Math.round((candidats.length / 500) * 100);

  const TARIFS = { cv: 300, letter: 200, "cv+letter": 400 };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", padding:"0 0 40px" }}>
      {/* Header */}
      <div style={{ background:"var(--ink)", padding:"16px 20px",
        display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)",
            color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
          ← Retour
        </button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
          fontWeight:700, color:"#fff", flex:1 }}>
          ⚙ Admin — CVtools
        </div>
        <button onClick={() => { loadData(); loadPromos(); }}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)",
            color:"#fff", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 }}>
          ↻ Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div style={{ background:"var(--ink)", borderTop:"1px solid rgba(255,255,255,0.1)",
        display:"flex", padding:"0 8px", overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {[
          { key:"candidats",    label:"👥 Candidats" },
          { key:"stats",        label:"📈 Statistiques" },
          { key:"testimonials", label:"💬 Témoignages" },
          { key:"promos",       label:"🎟 Codes promo" },
          { key:"settings",     label:"⚙️ Paramètres" },
        ].map(t => (
          <button key={t.key} onClick={() => setAdminTab(t.key)}
            style={{ padding:"12px 14px", fontSize:12.5, whiteSpace:"nowrap", fontWeight: adminTab===t.key ? 700 : 400,
              background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit",
              color: adminTab===t.key ? "#fff" : "rgba(255,255,255,0.5)",
              borderBottom: adminTab===t.key ? "2px solid var(--terra)" : "2px solid transparent",
              transition:"all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>

        {/* ═══════════════ ONGLET CANDIDATS ═══════════════ */}
        {adminTab === "candidats" && (<>
          {candidats.length >= LIMIT && (
            <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:10,
              padding:"12px 16px", marginBottom:16, fontSize:13, fontWeight:600, color:"#856404" }}>
              ⚠ {candidats.length} entrées — pensez à exporter en CSV puis nettoyer le Google Sheet.
            </div>
          )}

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:"Total",       val:stats.total,  color:"var(--ink)" },
              { label:"Aujourd'hui", val:stats.today,  color:"var(--terra)" },
              { label:"CV",          val:stats.cv,     color:"#2563eb" },
              { label:"Lettres",     val:stats.letter, color:"#7c3aed" },
              { label:"CV+Lettre",   val:stats.combo,  color:"#059669" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)",
                borderRadius:10, padding:"14px 12px", textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:"var(--ink4)", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Jauge */}
          <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10,
            padding:"12px 16px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12,
              color:"var(--ink3)", marginBottom:6 }}>
              <span>Entrées Google Sheets (limite affichage : 500)</span>
              <span style={{ fontWeight:700, color: fillPct>80 ? "#c0392b" : "var(--ink)" }}>{fillPct}%</span>
            </div>
            <div style={{ height:8, background:"#eee", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:fillPct+"%", borderRadius:4, transition:"width 0.5s",
                background: fillPct>80 ? "#c0392b" : fillPct>50 ? "#f59e0b" : "var(--terra)" }}/>
            </div>
          </div>

          {/* Filtres */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16, alignItems:"center" }}>
            <input style={{ flex:1, minWidth:180, padding:"9px 12px", border:"1.5px solid var(--border)",
              borderRadius:8, fontSize:13, fontFamily:"inherit", background:"#fff" }}
              placeholder="Rechercher nom, email, ville..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {["all","cv","letter","cv+letter"].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:"8px 14px", fontSize:12, borderRadius:8, cursor:"pointer",
                  fontFamily:"inherit", fontWeight: filter===f ? 700 : 400, border:"1.5px solid",
                  borderColor: filter===f ? "var(--terra)" : "var(--border)",
                  background: filter===f ? "rgba(184,92,56,0.1)" : "#fff",
                  color: filter===f ? "var(--terra)" : "var(--ink3)" }}>
                {f==="all"?"Tous":f==="cv"?"CV":f==="letter"?"Lettres":"CV+Lettre"}
                {" "}({f==="all"?stats.total:f==="cv"?stats.cv:f==="letter"?stats.letter:stats.combo})
              </button>
            ))}
            <button onClick={exportCSV}
              style={{ padding:"9px 16px", fontSize:13, borderRadius:8, cursor:"pointer",
                fontFamily:"inherit", fontWeight:700, background:"var(--terra)", color:"#fff",
                border:"none", boxShadow:"0 2px 8px rgba(184,92,56,0.3)" }}>
              ⬇ Export CSV
            </button>
          </div>

          {/* Tableau */}
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"var(--ink3)" }}>Chargement...</div>
          ) : error ? (
            <div style={{ background:"#fdf0ee", border:"1px solid rgba(192,57,43,0.2)",
              borderRadius:8, padding:16, color:"#c0392b", fontSize:13 }}>{error}</div>
          ) : (
            <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"var(--cream)", borderBottom:"2px solid var(--border)" }}>
                      {["Nom complet","Email","Téléphone","Ville","Titre","Mode","Date"].map(h => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700,
                          fontSize:11, textTransform:"uppercase", letterSpacing:"0.5px",
                          color:"var(--ink3)", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:"var(--ink4)" }}>
                        Aucun candidat trouvé
                      </td></tr>
                    ) : filtered.map((r,i) => (
                      <tr key={r.id} style={{ borderBottom:"1px solid var(--border)",
                        background: i%2===0 ? "#fff" : "var(--cream2)" }}>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{r.prenom} {r.nom}</td>
                        <td style={{ padding:"9px 12px", color:"var(--terra)" }}>{r.email}</td>
                        <td style={{ padding:"9px 12px" }}>{r.telephone}</td>
                        <td style={{ padding:"9px 12px" }}>{r.ville}</td>
                        <td style={{ padding:"9px 12px", maxWidth:160, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.titre}</td>
                        <td style={{ padding:"9px 12px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700,
                            background: r.mode==="cv+letter" ? "rgba(5,150,105,0.1)" :
                                        r.mode==="letter"    ? "rgba(124,58,237,0.1)" : "rgba(37,99,235,0.1)",
                            color:      r.mode==="cv+letter" ? "#059669" :
                                        r.mode==="letter"    ? "#7c3aed" : "#2563eb" }}>
                            {r.mode==="cv+letter" ? "CV+Lettre" : r.mode==="letter" ? "Lettre" : "CV"}
                          </span>
                        </td>
                        <td style={{ padding:"9px 12px", color:"var(--ink4)", whiteSpace:"nowrap" }}>
                          {r.date_creation ? (() => { try { const d = new Date(r.date_creation); return isNaN(d) ? r.date_creation.slice(0,10) : d.toLocaleDateString("fr-FR"); } catch(e) { return r.date_creation.slice(0,10); } })() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"10px 14px", fontSize:11, color:"var(--ink4)",
                borderTop:"1px solid var(--border)", textAlign:"right" }}>
                {filtered.length} résultat{filtered.length>1?"s":""} affiché{filtered.length>1?"s":""}
              </div>
            </div>
          )}
        </>)}

        {/* ═══════════════ ONGLET STATISTIQUES ═══════════════ */}
        {adminTab === "stats" && (() => {
          const byMode = { cv:0, letter:0, "cv+letter":0 };
          candidats.forEach(c => { if(byMode[c.mode] !== undefined) byMode[c.mode]++; });

          // Par jour (7 derniers jours)
          const dayLabels = [], dayCounts = [];
          for (let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const key = d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
            dayLabels.push(key);
            dayCounts.push(candidats.filter(c => {
              if (!c.date_creation) return false;
              try { const cd = new Date(c.date_creation); return cd.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}) === key; }
              catch(e) { return false; }
            }).length);
          }
          const maxDay = Math.max(...dayCounts, 1);

          // Templates
          const tplCount = {};
          candidats.forEach(c => { if(c.template) tplCount[c.template] = (tplCount[c.template]||0)+1; });
          const topTpls = Object.entries(tplCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

          // Villes
          const villeCount = {};
          candidats.forEach(c => { if(c.ville) { const v=c.ville.trim().split(",")[0].trim(); villeCount[v]=(villeCount[v]||0)+1; }});
          const topVilles = Object.entries(villeCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

          return (
            <div>
              {/* Répartition modes */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:14 }}>Répartition par produit</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[
                    { label:"CV seuls",    val:byMode.cv,          color:"#2563eb", pct: candidats.length ? Math.round(byMode.cv/candidats.length*100) : 0 },
                    { label:"Lettres",     val:byMode.letter,      color:"#7c3aed", pct: candidats.length ? Math.round(byMode.letter/candidats.length*100) : 0 },
                    { label:"CV+Lettre",   val:byMode["cv+letter"],color:"#059669", pct: candidats.length ? Math.round(byMode["cv+letter"]/candidats.length*100) : 0 },
                  ].map(s => (
                    <div key={s.label} style={{ background:"#fff", border:"1.5px solid var(--border)",
                      borderRadius:12, padding:"16px 14px" }}>
                      <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:11, color:"var(--ink4)", marginTop:2 }}>{s.label}</div>
                      <div style={{ marginTop:10, height:6, background:"#eee", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:s.pct+"%", background:s.color, borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:11, color:s.color, fontWeight:700, marginTop:4 }}>{s.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphique 7 jours */}
              <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
                padding:"18px 16px", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:16 }}>Téléchargements — 7 derniers jours</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                  {dayLabels.map((label, i) => (
                    <div key={label} style={{ flex:1, display:"flex", flexDirection:"column",
                      alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"var(--terra)" }}>
                        {dayCounts[i] > 0 ? dayCounts[i] : ""}
                      </div>
                      <div style={{ width:"100%", background:"var(--terra)", borderRadius:"4px 4px 0 0",
                        height: Math.max(4, (dayCounts[i]/maxDay)*90) + "px",
                        opacity: dayCounts[i]===0 ? 0.15 : 1, transition:"height 0.4s" }}/>
                      <div style={{ fontSize:10, color:"var(--ink4)", whiteSpace:"nowrap" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top templates + Villes */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12, padding:"16px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                    letterSpacing:"1px", marginBottom:12 }}>Top templates</div>
                  {topTpls.length === 0 ? <div style={{ fontSize:12, color:"var(--ink4)" }}>Aucune donnée</div> :
                    topTpls.map(([name, count]) => (
                      <div key={name} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:12, color:"var(--ink3)", flex:1,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--terra)",
                          marginLeft:8, flexShrink:0 }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
                <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12, padding:"16px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase",
                    letterSpacing:"1px", marginBottom:12 }}>Top villes</div>
                  {topVilles.length === 0 ? <div style={{ fontSize:12, color:"var(--ink4)" }}>Aucune donnée</div> :
                    topVilles.map(([ville, count]) => (
                      <div key={ville} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:12, color:"var(--ink3)" }}>{ville}</div>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--terra)" }}>{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════ ONGLET TÉMOIGNAGES ═══════════════ */}
        {adminTab === "testimonials" && (
          <div>
            {/* Message feedback */}
            {testiMsg && (
              <div style={{ marginBottom:14, fontSize:13, fontWeight:700,
                color: testiMsg.startsWith("⚠") ? "#c0392b" : "#059669",
                background: testiMsg.startsWith("⚠") ? "#fdf0ee" : "rgba(5,150,105,0.08)",
                border: "1px solid " + (testiMsg.startsWith("⚠") ? "rgba(192,57,43,0.2)" : "rgba(5,150,105,0.2)"),
                borderRadius:8, padding:"10px 14px" }}>
                {testiMsg}
              </div>
            )}

            {/* Formulaire ajout / édition */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:12,
              padding:"18px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:14 }}>
                {testiEdit ? "✏️ Modifier le témoignage" : "➕ Ajouter un témoignage"}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Nom *</div>
                  <input className="field" style={{ margin:0 }}
                    placeholder="Ex : Fousseni DIALLO"
                    value={testiForm.name}
                    onChange={e => setTestiForm(f => ({...f, name:e.target.value}))}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Rôle / Métier</div>
                  <input className="field" style={{ margin:0 }}
                    placeholder="Ex : Étudiant, Comptable..."
                    value={testiForm.role}
                    onChange={e => setTestiForm(f => ({...f, role:e.target.value}))}/>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>Témoignage *</div>
                <textarea className="field" rows={3} style={{ margin:0, resize:"vertical" }}
                  placeholder="Ce que la personne dit de CVtools..."
                  value={testiForm.text}
                  onChange={e => setTestiForm(f => ({...f, text:e.target.value}))}/>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-main" style={{ fontSize:13, padding:"9px 20px" }}
                  onClick={testiEdit ? updateTesti : addTesti}>
                  {testiEdit ? "💾 Enregistrer" : "➕ Ajouter"}
                </button>
                {testiEdit && (
                  <button className="btn-line" style={{ fontSize:13 }} onClick={cancelEdit}>
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Liste des témoignages */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {testis.length === 0 ? (
                <div style={{ textAlign:"center", padding:32, color:"var(--ink4)", fontSize:13 }}>
                  Aucun témoignage — ajoutez-en un ci-dessus.
                </div>
              ) : testis.map((t, i) => (
                <div key={t.id} style={{ background:"#fff", border:"1.5px solid var(--border)",
                  borderRadius:10, padding:"14px 16px",
                  opacity: t.actif === false ? 0.5 : 1, transition:"opacity 0.2s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{t.name}</span>
                        {t.role && <span style={{ fontSize:11, color:"var(--ink4)" }}>— {t.role}</span>}
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, fontWeight:600,
                          background: t.actif === false ? "#fdf0ee" : "rgba(5,150,105,0.1)",
                          color:      t.actif === false ? "#c0392b" : "#059669",
                          border:     "1px solid " + (t.actif === false ? "rgba(192,57,43,0.2)" : "rgba(5,150,105,0.2)") }}>
                          {t.actif === false ? "Masqué" : "Visible"}
                        </span>
                      </div>
                      <div style={{ fontSize:12.5, color:"var(--ink3)", fontStyle:"italic",
                        lineHeight:1.6 }}>"{t.text}"</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                      <button className="btn-text" style={{ fontSize:12 }}
                        onClick={() => startEdit(t)}>✏️ Modifier</button>
                      <button className="btn-text" style={{ fontSize:12 }}
                        onClick={() => toggleTesti(t)}>
                        {t.actif === false ? "▶ Afficher" : "⏸ Masquer"}
                      </button>
                      <button className="btn-text" style={{ fontSize:12, color:"#c0392b" }}
                        onClick={() => deleteTesti(t.id)}>🗑 Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ ONGLET CODES PROMO ═══════════════ */}
        {adminTab === "promos" && (() => {
          // Composant interne pour gérer son propre state
          return <PromoTab/>;
        })()}

                {/* ═══════════════ ONGLET PARAMÈTRES ═══════════════ */}
        {adminTab === "settings" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* ── Changer le mot de passe ── */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)",
              borderRadius:12, padding:"20px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
                🔒 Changer le mot de passe admin
              </div>
              <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:16 }}>
                Mot de passe actuel par défaut : <strong>cvtools2026</strong>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:400 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Mot de passe actuel *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Votre mot de passe actuel"
                    value={pwdCurrent}
                    onChange={e => setPwdCurrent(e.target.value)}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Nouveau mot de passe *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Minimum 6 caractères"
                    value={pwdNew}
                    onChange={e => setPwdNew(e.target.value)}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--ink3)", marginBottom:4 }}>
                    Confirmer le nouveau mot de passe *
                  </div>
                  <input type="password" className="field" style={{ margin:0 }}
                    placeholder="Répétez le nouveau mot de passe"
                    value={pwdConfirm}
                    onChange={e => setPwdConfirm(e.target.value)}/>
                </div>
                {pwdMsg && (
                  <div style={{ fontSize:13, fontWeight:600, padding:"9px 14px", borderRadius:8,
                    background: pwdMsg.startsWith("✓") ? "rgba(5,150,105,0.08)" : "#fdf0ee",
                    color:      pwdMsg.startsWith("✓") ? "#059669" : "#c0392b",
                    border:     "1px solid " + (pwdMsg.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(192,57,43,0.2)") }}>
                    {pwdMsg}
                  </div>
                )}
                <button className="btn-main" style={{ fontSize:13, padding:"10px 20px",
                  alignSelf:"flex-start" }}
                  onClick={async () => {
                    if (!pwdCurrent) { setPwdMsg("⚠ Entrez votre mot de passe actuel."); return; }
                    const currentOk = await getAdminPwd();
                    if (pwdCurrent !== currentOk) { setPwdMsg("⚠ Mot de passe actuel incorrect."); return; }
                    if (pwdNew.length < 6) { setPwdMsg("⚠ Minimum 6 caractères."); return; }
                    if (pwdNew !== pwdConfirm) { setPwdMsg("⚠ Les mots de passe ne correspondent pas."); return; }
                    await updateConfig("admin_pwd", pwdNew);
                    setPwdCurrent(""); setPwdNew(""); setPwdConfirm("");
                    setPwdMsg("✓ Mot de passe changé avec succès !");
                    setTimeout(() => setPwdMsg(""), 4000);
                  }}>
                  🔒 Changer le mot de passe
                </button>
              </div>
            </div>

            {/* ── Message d'annonce landing ── */}
            <div style={{ background:"#fff", border:"1.5px solid var(--border)",
              borderRadius:12, padding:"20px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
                📢 Message d'annonce
              </div>
              <div style={{ fontSize:12, color:"var(--ink4)", marginBottom:16 }}>
                Affiché en bandeau sur la landing page. Laissez vide pour désactiver.
              </div>
              <textarea className="field" rows={3} style={{ margin:0, resize:"vertical", maxWidth:500 }}
                placeholder="Ex : 🎉 Promotion -50% ce week-end ! Code : PROMO50"
                value={announce}
                onChange={e => setAnnounce(e.target.value)}/>
              {announceMsg && (
                <div style={{ marginTop:8, fontSize:13, fontWeight:600, color:"#059669" }}>
                  {announceMsg}
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button className="btn-main" style={{ fontSize:13, padding:"9px 20px" }}
                  onClick={async () => {
                    await updateConfig("announce", announce);
                    setAnnounceMsg("✓ Message enregistré !");
                    setTimeout(() => setAnnounceMsg(""), 3000);
                  }}>
                  💾 Enregistrer
                </button>
                {announce && (
                  <button className="btn-line" style={{ fontSize:13 }}
                    onClick={async () => {
                      setAnnounce("");
                      await updateConfig("announce", "");
                      setAnnounceMsg("✓ Message supprimé.");
                      setTimeout(() => setAnnounceMsg(""), 3000);
                    }}>
                    🗑 Supprimer l'annonce
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}


export { AdminDashboard };
