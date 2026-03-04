import { useState, useRef, ReactNode, ChangeEvent, MouseEvent } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────
type FieldType = "text" | "password" | "email" | "number" | "dropdown" | "checkbox" | "radio" | "date" | "file" | "textarea";
type Priority = "High" | "Medium" | "Low";
type Status = "Pending" | "Pass" | "Fail" | "Blocked";
type TabType = "builder" | "testcases";

interface Field {
  id: number;
  type: FieldType;
  label: string;
  mandatory: boolean;
  validation: Record<string, any>;
  options: string[];
}

interface TestCase {
  id: string;
  rowId: number;
  module: string;
  scenario: string;
  description: string;
  steps: string;
  testData: string;
  expected: string;
  actual: string;
  priority: Priority;
  status: Status;
}

interface ColorScheme {
  bg?: string;
  text?: string;
  border?: string;
}

interface FieldTypeItem {
  id: FieldType;
  label: string;
  icon: string;
}

// ── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#080b14",
  surface: "#0d1120",
  card: "#111827",
  border: "#1e2d45",
  accent: "#00d4ff",
  accentDim: "#00d4ff22",
  green: "#00ff9d",
  yellow: "#ffd166",
  red: "#ff4d6d",
  text: "#dde8f5",
  muted: "#4a6080",
  highlight: "#0d1e33",
};

const PRIORITY_C: Record<Priority, ColorScheme> = {
  High:   { bg:"#2a0d14", text:"#ff4d6d", border:"#5a1a28" },
  Medium: { bg:"#2a2005", text:"#ffd166", border:"#5a4010" },
  Low:    { bg:"#042a18", text:"#00ff9d", border:"#0a5030" },
};
const STATUS_C: Record<Status, ColorScheme> = {
  Pending: { bg:"#0d1e33", text:"#4a8aaa" },
  Pass:    { bg:"#042a18", text:"#00ff9d" },
  Fail:    { bg:"#2a0d14", text:"#ff4d6d" },
  Blocked: { bg:"#2a1800", text:"#ffaa44" },
};

const FIELD_TYPES: FieldTypeItem[] = [
  { id:"text",      label:"Text Field",    icon:"Aa" },
  { id:"password",  label:"Password",      icon:"🔒" },
  { id:"email",     label:"Email",         icon:"@" },
  { id:"number",    label:"Number",        icon:"#" },
  { id:"dropdown",  label:"Dropdown",      icon:"▾" },
  { id:"checkbox",  label:"Checkbox",      icon:"☑" },
  { id:"radio",     label:"Radio",         icon:"◉" },
  { id:"date",      label:"Date Picker",   icon:"📅" },
  { id:"file",      label:"File Upload",   icon:"📎" },
  { id:"textarea",  label:"Text Area",     icon:"¶" },
];

// ── SMALL COMPONENTS ───────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  color?: ColorScheme;
}

function Badge({ children, color }: BadgeProps): JSX.Element {
  return (
    <span style={{
      padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:700,
      letterSpacing:.5, background:color?.bg||C.highlight,
      color:color?.text||C.muted, border:`1px solid ${color?.border||C.border}`,
      display:"inline-block",
    }}>{children}</span>
  );
}

function Spinner(): JSX.Element {
  return <span style={{
    display:"inline-block", width:14, height:14, marginRight:6,
    border:`2px solid ${C.border}`, borderTop:`2px solid ${C.accent}`,
    borderRadius:"50%", animation:"spin .7s linear infinite", verticalAlign:"middle",
  }}/>;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [apiKey,     setApiKey]     = useState<string>("");
  const [showKey,    setShowKey]    = useState<boolean>(false);
  const [fields,     setFields]     = useState<Field[]>([]);
  const [module,     setModule]     = useState<string>("Login Form");
  const [testCases,  setTestCases]  = useState<TestCase[]>([]);
  const [loading,    setLoading]    = useState<boolean>(false);
  const [error,      setError]      = useState<string>("");
  const [tab,        setTab]        = useState<TabType>("builder");
  const [selected,   setSelected]   = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  // ── Field CRUD ─────────────────────────────────────────────────────────
  const addField = (type: FieldType): void => {
    const ft = FIELD_TYPES.find(f=>f.id===type);
    if(!ft) return;
    setFields(p=>[...p,{
      id:Date.now(), type, label:ft.label,
      mandatory:false, validation:{},
      options:["dropdown","checkbox","radio"].includes(type)?["Option 1","Option 2"]:[],
    }]);
  };
  const removeField = (id: number): void => { setFields(p=>p.filter(f=>f.id!==id)); if(selected===id)setSelected(null); };
  const updateField = (id: number, u: Partial<Field>): void => setFields(p=>p.map(f=>f.id===id?{...f,...u}:f));
  const updateVal   = (id: number, k: string, v: any): void => setFields(p=>p.map(f=>f.id===id?{...f,validation:{...f.validation,[k]:v}}:f));
  const addOpt      = (id: number): void => setFields(p=>p.map(f=>f.id===id?{...f,options:[...f.options,`Option ${f.options.length+1}`]}:f));
  const updateOpt   = (id: number, i: number, v: string): void => setFields(p=>p.map(f=>f.id===id?{...f,options:f.options.map((o,j)=>j===i?v:o)}:f));
  const removeOpt   = (id: number, i: number): void => setFields(p=>p.map(f=>f.id===id?{...f,options:f.options.filter((_,j)=>j!==i)}:f));

  // ── Generate via Groq ──────────────────────────────────────────────────
  async function generate(): Promise<void> {
    if(!apiKey.trim()){ setError("Please enter your Groq API key."); return; }
    if(!fields.length){ setError("Add at least one field first."); return; }
    setLoading(true); setError(""); setTab("testcases");

    const desc = fields.map(f=>{
      let s=`${f.label} [type:${f.type}, mandatory:${f.mandatory}`;
      if(Object.keys(f.validation).length) s+=`, validation:${JSON.stringify(f.validation)}`;
      if(f.options?.length) s+=`, options:[${f.options.join(", ")}]`;
      return s+"]";
    }).join("\n");

    const prompt = `You are a senior QA engineer. Generate 12-15 comprehensive test cases for a UI form module named "${module}".

Fields:
${desc}

Cover: positive path, negative/validation, boundary values, mandatory field checks, edge cases, UI interactions.

IMPORTANT: Respond ONLY with a raw JSON array. No markdown, no code fences, no explanation.

Format:
[{"id":"TC001","module":"${module}","scenario":"...","description":"...","steps":"Step 1: ...\\nStep 2: ...\\nStep 3: ...","testData":"...","expected":"...","actual":"","priority":"High","status":"Pending"}]

Priority must be one of: High, Medium, Low
Status must be: Pending`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${apiKey.trim()}`,
        },
        body:JSON.stringify({
          model:"llama-3.3-70b-versatile",
          temperature:0.3,
          max_tokens:4000,
          messages:[
            { role:"system", content:"You are a QA engineer. Always respond with raw JSON only. No markdown or code fences." },
            { role:"user",   content:prompt },
          ],
        }),
      });

      if(!res.ok){
        const errData = await res.json().catch(()=>({}));
        throw new Error((errData as any)?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      let raw = (data.choices?.[0]?.message?.content as string) || "[]";
      raw = raw.replace(/```json|```/gi,"").trim();
      // find first [ ... ]
      const start = raw.indexOf("["), end = raw.lastIndexOf("]");
      if(start!==-1 && end!==-1) raw = raw.slice(start, end+1);
      const parsed = JSON.parse(raw) as TestCase[];
      setTestCases(parsed.map((tc,i)=>({...tc, id:`TC${String(i+1).padStart(3,"0")}`, rowId:i+1})));
    } catch(e) {
      setError("Error: "+(e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  const updateTC = (rowId: number, k: keyof TestCase, v: any): void => setTestCases(p=>p.map(tc=>tc.rowId===rowId?{...tc,[k]:v}:tc));

  // ── Export XLSX ────────────────────────────────────────────────────────
  function exportXLSX(): void {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = ()=>{
      const XLSX = (window as any).XLSX;
      const headers = ["Test Case ID","Module","Test Scenario","Test Case Description","Test Steps","Test Data","Expected Result","Actual Result","Priority","Status"];
      const rows = testCases.map(tc=>[tc.id,tc.module,tc.scenario,tc.description,tc.steps,tc.testData,tc.expected,tc.actual,tc.priority,tc.status]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
      ws["!cols"]=[{wch:12},{wch:16},{wch:26},{wch:32},{wch:38},{wch:22},{wch:32},{wch:22},{wch:10},{wch:10}];
      // Bold header row
      headers.forEach((_,i)=>{
        const cell = ws[XLSX.utils.encode_cell({r:0,c:i})];
        if(cell) cell.s={font:{bold:true},fill:{fgColor:{rgb:"001F3F"}}};
      });
      XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
      XLSX.writeFile(wb, `${module.replace(/\s+/g,"_")}_TestCases.xlsx`);
    };
    document.head.appendChild(s);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'JetBrains Mono','Fira Code',monospace", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Exo+2:wght@400;700;900&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.surface}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        .fc:hover{border-color:${C.accent}44!important;background:${C.highlight}!important}
        .tc-row:hover td{background:${C.highlight}!important}
        .btn{font-family:inherit;cursor:pointer;border-radius:5px;font-size:11px;font-weight:700;letter-spacing:.8px;transition:all .2s;border:none}
        .btn-a{background:linear-gradient(135deg,${C.accent},#0080ff);color:#000;padding:8px 18px}
        .btn-a:hover{filter:brightness(1.2);transform:translateY(-1px);box-shadow:0 4px 20px ${C.accentDim}}
        .btn-a:disabled{opacity:.35;cursor:not-allowed;transform:none;filter:none}
        .btn-g{background:transparent;color:${C.muted};border:1px solid ${C.border};padding:7px 14px}
        .btn-g:hover{border-color:${C.accent};color:${C.accent}}
        .btn-s{background:transparent;color:${C.green};border:1px solid #0a5030;padding:7px 16px}
        .btn-s:hover{background:#042a18}
        .btn-d{background:transparent;color:${C.red};border:1px solid #5a1a28;padding:4px 9px;font-size:10px}
        .btn-d:hover{background:#2a0d14}
        input,select,textarea{background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:5px 9px;border-radius:4px;font-family:inherit;font-size:11px;outline:none;transition:border .2s}
        input:focus,select:focus,textarea:focus{border-color:${C.accent}}
        select option{background:${C.surface}}
        .tab{padding:7px 18px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit;letter-spacing:.8px;transition:all .2s}
        .tab-on{background:${C.accent};color:#000}
        .tab-off{background:transparent;color:${C.muted}}
        .tab-off:hover{color:${C.text}}
        td input,td select,td textarea{width:100%;box-sizing:border-box;font-size:10px}
        .glow{text-shadow:0 0 20px ${C.accent}88}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{position:"relative"}}>
          <div style={{width:38,height:38,borderRadius:8,background:`linear-gradient(135deg,${C.accent},#0050cc)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#000"}}>⚡</div>
        </div>
        <div>
          <div className="glow" style={{fontFamily:"'Exo 2',sans-serif",fontSize:17,fontWeight:900,letterSpacing:2,color:C.accent}}>UI TEST FORGE</div>
          <div style={{fontSize:9,color:C.muted,letterSpacing:3}}>POWERED BY GROQ · LLAMA 3.3-70B · FREE OPEN SOURCE</div>
        </div>

        {/* API Key input */}
        <div style={{marginLeft:24,display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 12px",flex:1,maxWidth:380}}>
          <span style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>🔑 Groq Key:</span>
          <input
            type={showKey?"text":"password"}
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e: ChangeEvent<HTMLInputElement>)=>setApiKey(e.target.value)}
            style={{flex:1,border:"none",background:"transparent",fontSize:11,padding:"2px 0"}}
          />
          <button className="btn btn-g" style={{padding:"3px 8px",fontSize:10}} onClick={()=>setShowKey(p=>!p)}>{showKey?"hide":"show"}</button>
        </div>
        <div style={{fontSize:9,color:C.muted,maxWidth:160,lineHeight:1.5}}>
          Free at <span style={{color:C.accent}}>console.groq.com</span>
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button className={`tab ${tab==="builder"?"tab-on":"tab-off"}`} onClick={()=>setTab("builder")}>⚙ BUILDER</button>
          <button className={`tab ${tab==="testcases"?"tab-on":"tab-off"}`} onClick={()=>setTab("testcases")}>
            📋 TEST CASES{testCases.length>0?` (${testCases.length})`:""}
          </button>
        </div>
      </div>

      {/* ── BUILDER TAB ── */}
      {tab==="builder" && (
        <div style={{display:"flex",height:"calc(100vh - 68px)",overflow:"hidden"}}>

          {/* Left Panel */}
          <div style={{width:190,background:C.surface,borderRight:`1px solid ${C.border}`,padding:14,overflowY:"auto",flexShrink:0}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:12}}>FIELD TYPES</div>
            {FIELD_TYPES.map(ft=>(
              <div key={ft.id} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"7px 10px",marginBottom:5,background:C.card,
                borderRadius:5,border:`1px solid ${C.border}`,
              }}>
                <span style={{fontSize:11}}><span style={{marginRight:6,opacity:.7}}>{ft.icon}</span>{ft.label}</span>
                <button className="btn btn-a" style={{padding:"3px 9px",fontSize:10}} onClick={()=>addField(ft.id)}>+</button>
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div style={{flex:1,padding:20,overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>MODULE</span>
              <input type="text" value={module} onChange={(e: ChangeEvent<HTMLInputElement>)=>setModule(e.target.value)} style={{width:220}} />
              <button className="btn btn-a" style={{marginLeft:"auto"}} onClick={generate} disabled={loading||!fields.length}>
                {loading?<><Spinner/>Generating...</>:"⚡ Generate Test Cases"}
              </button>
            </div>

            {error&&<div style={{background:"#2a0d14",border:`1px solid #5a1a28`,color:C.red,padding:"9px 14px",borderRadius:5,marginBottom:12,fontSize:11}}>{error}</div>}

            {!fields.length?(
              <div style={{textAlign:"center",padding:60,color:C.muted}}>
                <div style={{fontSize:44,marginBottom:12,opacity:.3}}>⊕</div>
                <div style={{fontSize:13}}>Add fields from the left panel</div>
                <div style={{fontSize:10,marginTop:6,opacity:.5}}>Click + next to any field type to add it</div>
              </div>
            ):(
              fields.map((field,i)=>(
                <div key={field.id} className="fc"
                  onClick={()=>setSelected(field.id===selected?null:field.id)}
                  style={{
                    background:selected===field.id?C.highlight:C.card,
                    border:`1px solid ${selected===field.id?C.accent+"55":C.border}`,
                    borderRadius:7,padding:"11px 15px",marginBottom:7,cursor:"pointer",
                    animation:"fadeUp .2s ease",transition:"all .2s",
                  }}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{color:C.accent,fontSize:11,fontWeight:700,fontFamily:"'Exo 2',sans-serif"}}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{fontSize:12,fontWeight:600}}>{field.label}</span>
                    <Badge>{field.type}</Badge>
                    {field.mandatory&&<Badge color={{bg:"#001a33",text:C.accent,border:"#003366"}}>mandatory</Badge>}
                    <div style={{marginLeft:"auto",display:"flex",gap:8}} onClick={(e: MouseEvent<HTMLDivElement>)=>e.stopPropagation()}>
                      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted,cursor:"pointer"}}>
                        <input type="checkbox" checked={field.mandatory} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateField(field.id,{mandatory:e.target.checked})}/>
                        Mandatory
                      </label>
                      <button className="btn btn-d" onClick={()=>removeField(field.id)}>✕ Remove</button>
                    </div>
                  </div>

                  {selected===field.id&&(
                    <div style={{marginTop:11,paddingTop:11,borderTop:`1px dashed ${C.border}`}} onClick={(e: MouseEvent<HTMLDivElement>)=>e.stopPropagation()}>
                      <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>CONFIG</div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                        <label style={{fontSize:10,color:C.muted}}>Label:
                          <input type="text" value={field.label} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateField(field.id,{label:e.target.value})} style={{marginLeft:6,width:160}}/>
                        </label>
                        {["text","password","email","textarea"].includes(field.type)&&<>
                          <label style={{fontSize:10,color:C.muted}}>Min Len:
                            <input type="number" value={field.validation.minLength||""} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"minLength",e.target.value)} style={{marginLeft:6,width:55}}/>
                          </label>
                          <label style={{fontSize:10,color:C.muted}}>Max Len:
                            <input type="number" value={field.validation.maxLength||""} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"maxLength",e.target.value)} style={{marginLeft:6,width:55}}/>
                          </label>
                        </>}
                        {field.type==="text"&&(
                          <label style={{fontSize:10,color:C.muted}}>Regex:
                            <input type="text" value={field.validation.regex||""} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"regex",e.target.value)} style={{marginLeft:6,width:140}} placeholder="[a-zA-Z0-9]*"/>
                          </label>
                        )}
                        {field.type==="number"&&<>
                          <label style={{fontSize:10,color:C.muted}}>Min:
                            <input type="number" value={field.validation.min||""} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"min",e.target.value)} style={{marginLeft:6,width:55}}/>
                          </label>
                          <label style={{fontSize:10,color:C.muted}}>Max:
                            <input type="number" value={field.validation.max||""} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"max",e.target.value)} style={{marginLeft:6,width:55}}/>
                          </label>
                        </>}
                        {field.type==="password"&&(
                          <label style={{fontSize:10,color:C.muted,display:"flex",alignItems:"center",gap:5}}>
                            <input type="checkbox" checked={field.validation.specialChar||false} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"specialChar",e.target.checked)}/>
                            Require Special Char
                          </label>
                        )}
                      </div>

                      {["dropdown","checkbox","radio"].includes(field.type)&&(
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:6}}>OPTIONS</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {field.options.map((opt,idx)=>(
                              <div key={idx} style={{display:"flex",alignItems:"center",gap:4}}>
                                <input type="text" value={opt} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateOpt(field.id,idx,e.target.value)} style={{width:110}}/>
                                <button className="btn btn-d" style={{padding:"3px 7px"}} onClick={()=>removeOpt(field.id,idx)}>✕</button>
                              </div>
                            ))}
                            <button className="btn btn-g" style={{fontSize:10}} onClick={()=>addOpt(field.id)}>+ Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TEST CASES TAB ── */}
      {tab==="testcases"&&(
        <div style={{padding:16,height:"calc(100vh - 68px)",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>
              {testCases.length>0?`${testCases.length} TEST CASES — ${module.toUpperCase()}`:"NO TEST CASES"}
            </span>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {loading&&<span style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center"}}><Spinner/>AI generating...</span>}
              <button className="btn btn-g" onClick={()=>setTab("builder")}>← Builder</button>
              {testCases.length>0&&<button className="btn btn-s" onClick={exportXLSX}>⬇ Export XLSX</button>}
              {fields.length>0&&<button className="btn btn-a" onClick={generate} disabled={loading}>
                {loading?<><Spinner/>...</>:"⚡ Regenerate"}
              </button>}
            </div>
          </div>

          {error&&<div style={{background:"#2a0d14",border:`1px solid #5a1a28`,color:C.red,padding:"9px 14px",borderRadius:5,marginBottom:10,fontSize:11}}>{error}</div>}

          {!testCases.length&&!loading?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.muted}}>
              <div style={{fontSize:48,marginBottom:16,opacity:.3}}>📋</div>
              <div style={{fontSize:13,marginBottom:6}}>No test cases yet</div>
              <div style={{fontSize:11,marginBottom:20,opacity:.6}}>Go to Builder → add fields → Generate</div>
              <button className="btn btn-a" onClick={()=>setTab("builder")}>← Open Builder</button>
            </div>
          ):(
            <div style={{flex:1,overflowX:"auto",overflowY:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}} ref={tableRef}>
                <thead>
                  <tr style={{background:C.card,position:"sticky",top:0,zIndex:2}}>
                    {["Test Case ID","Module","Test Scenario","Test Case Description","Test Steps","Test Data","Expected Result","Actual Result","Priority","Status"].map(h=>(
                      <th key={h} style={{
                        padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:700,
                        letterSpacing:1,fontSize:9,whiteSpace:"nowrap",
                        borderBottom:`2px solid ${C.accent}44`,background:C.card,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc,i)=>(
                    <tr key={tc.rowId} className="tc-row" style={{animation:`fadeUp .15s ease ${i*.025}s both`}}>
                      {[
                        {key:"id",      w:75,  type:"id"},
                        {key:"module",  w:100, type:"text"},
                        {key:"scenario",w:170, type:"text"},
                        {key:"description",w:190,type:"text"},
                        {key:"steps",   w:210, type:"multi"},
                        {key:"testData",w:130, type:"text"},
                        {key:"expected",w:190, type:"text"},
                        {key:"actual",  w:130, type:"text"},
                        {key:"priority",w:90,  type:"select", opts:["High","Medium","Low"]},
                        {key:"status",  w:100, type:"select", opts:["Pending","Pass","Fail","Blocked"]},
                      ].map(({key,w,type,opts})=>(
                        <td key={key} style={{
                          padding:"7px 10px",borderBottom:`1px solid ${C.border}22`,
                          background:i%2===0?C.surface:C.bg,minWidth:w,maxWidth:w+60,
                          verticalAlign:"top",transition:"background .15s",
                        }}>
                          {type==="id"?(
                            <span style={{color:C.accent,fontWeight:700,fontSize:11,fontFamily:"'Exo 2',sans-serif"}}>{tc[key]}</span>
                          ):type==="multi"?(
                            <textarea value={tc[key]} onChange={(e: ChangeEvent<HTMLTextAreaElement>)=>updateTC(tc.rowId,key as keyof TestCase,e.target.value)} rows={3} style={{resize:"vertical",lineHeight:1.5}}/>
                          ):type==="select"?(
                            <div>
                              <select value={tc[key]} onChange={(e: ChangeEvent<HTMLSelectElement>)=>updateTC(tc.rowId,key as keyof TestCase,e.target.value)} style={{marginBottom:4}}>
                                {opts.map(o=><option key={o}>{o}</option>)}
                              </select>
                              <div style={{marginTop:3}}>
                                <Badge color={key==="priority"?PRIORITY_C[tc[key] as Priority]:STATUS_C[tc[key] as Status]}>{tc[key]}</Badge>
                              </div>
                            </div>
                          ):(
                            <input type="text" value={tc[key]} onChange={(e: ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,key as keyof TestCase,e.target.value)}/>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {testCases.length>0&&(
            <div style={{display:"flex",gap:10,padding:"10px 0 0",borderTop:`1px solid ${C.border}`,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>PRIORITY:</span>
              {["High","Medium","Low"].map(p=><Badge key={p} color={PRIORITY_C[p]}>{p}: {testCases.filter(t=>t.priority===p).length}</Badge>)}
              <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginLeft:16}}>STATUS:</span>
              {["Pending","Pass","Fail","Blocked"].map(s=>{
                const n=testCases.filter(t=>t.status===s).length;
                return n>0?<Badge key={s} color={STATUS_C[s]}>{s}: {n}</Badge>:null;
              })}
              <span style={{marginLeft:"auto",fontSize:9,color:C.muted}}>
                All cells are editable · Update Actual Result & Status after testing
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}