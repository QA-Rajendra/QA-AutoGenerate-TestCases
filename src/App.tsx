import { useState, useRef, ReactNode, ChangeEvent, MouseEvent, useCallback, JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ThemeToggle from "./components/ThemeToggle";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
type FieldType = "text"|"password"|"email"|"number"|"dropdown"|"checkbox"|"radio"|"date"|"file"|"textarea"|"button";
type ButtonAction = "submit"|"cancel"|"custom";
type Priority = "High"|"Medium"|"Low";
type Status = "Pending"|"Pass"|"Fail"|"Blocked";
type TabType = "builder"|"testcases"|"versions";
type BuildState = "idle"|"locked"|"unlocked";
type TCCategory = "All"|"Functional"|"Validation"|"Boundary"|"Negative"|"Dependency"|"Regression"|"Delta";

interface ConditionBranch {
  id: number;
  ifLabel: string;
  thenAction: string;
  elseAction: string;
}

interface Dependency {
  id: number;
  sourceFieldId: number | null;
  triggerValue: string;
  action: "show"|"hide"|"enable"|"disable"|"require";
  targetFieldId: number | null;
}

interface Field {
  id: number;
  type: FieldType;
  label: string;
  mandatory: boolean;
  validation: Record<string, unknown>;
  options: string[];
  buttonAction?: ButtonAction;
  buttonVariant?: "primary"|"secondary"|"danger";
  conditions?: ConditionBranch[];
  customValidations?: string[];
  dependencies?: Dependency[];
  defaultValue?: string;
}

interface BuildVersion {
  version: number;
  timestamp: string;
  moduleName: string;
  fields: Field[];
  globalValidations: string;
  testCases: TestCase[];
  changeLog: DiffResult;
}

interface DiffResult {
  addedFields: string[];
  removedFields: string[];
  modifiedFields: string[];
  validationChanges: string[];
  dependencyChanges: string[];
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
  category: string;
  severity?: string;
  versionTag?: string;
}

interface ColorScheme { bg?: string; text?: string; border?: string; }

// ═══════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════
// colors now drawn from CSS custom properties so they respond to light/dark
const C = {
  bg:"var(--bg)", surface:"var(--surface)", card:"var(--card)", cardHover:"var(--cardHover)",
  border:"var(--border)", borderHover:"var(--borderHover)",
  accent:"var(--accent)", accentDim:"var(--accentDim)", accentGlow:"var(--accentGlow)",
  green:"var(--green)", greenDim:"var(--greenDim)",
  yellow:"var(--yellow)", yellowDim:"var(--yellowDim)",
  red:"var(--red)", redDim:"var(--redDim)",
  orange:"var(--orange)", orangeDim:"var(--orangeDim)",
  purple:"var(--purple)", purpleDim:"var(--purpleDim)",
  teal:"var(--teal)", tealDim:"var(--tealDim)",
  text:"var(--text)", textDim:"var(--textDim)", muted:"var(--muted)", highlight:"var(--highlight)",
};

const PRIORITY_C: Record<Priority, ColorScheme> = {
  High:   { bg:"#1e0a10", text:"#ff4d6d", border:"#4a1525" },
  Medium: { bg:"#1e1800", text:"#ffc847", border:"#4a3800" },
  Low:    { bg:"#001e14", text:"#00e5a0", border:"#004030" },
};
const STATUS_C: Record<Status, ColorScheme> = {
  Pending:{ bg:"#0a1525", text:"#5a8aaa", border:"#1c3050" },
  Pass:   { bg:"#001e14", text:"#00e5a0", border:"#004030" },
  Fail:   { bg:"#1e0a10", text:"#ff4d6d", border:"#4a1525" },
  Blocked:{ bg:"#1e1200", text:"#ff8c42", border:"#4a2a00" },
};
const CATEGORY_C: Record<string, ColorScheme> = {
  Functional:  { bg:"#001830", text:"#00d4ff", border:"#003060" },
  Validation:  { bg:"#1e0a10", text:"#ff4d6d", border:"#4a1525" },
  Boundary:    { bg:"#1e1200", text:"#ff8c42", border:"#4a2a00" },
  Negative:    { bg:"#1e0015", text:"#ff5ca8", border:"#4a0030" },
  Dependency:  { bg:"#0f001e", text:"#b57cff", border:"#3a0060" },
  Regression:  { bg:"#001e14", text:"#00e5a0", border:"#004030" },
  Delta:       { bg:"#1e1800", text:"#ffc847", border:"#4a3800" },
};

const BTN_VARIANT_C = {
  primary:  { bg:C.accent,   text:"#000", border:C.accent },
  secondary:{ bg:C.surface,  text:C.textDim, border:C.border },
  danger:   { bg:C.red,      text:"#fff", border:C.red },
};

const FIELD_TYPES = [
  { id:"text"      as FieldType, label:"Text Field",  icon:"Aa" },
  { id:"password"  as FieldType, label:"Password",    icon:"🔒" },
  { id:"email"     as FieldType, label:"Email",        icon:"@"  },
  { id:"number"    as FieldType, label:"Number",       icon:"#"  },
  { id:"dropdown"  as FieldType, label:"Dropdown",     icon:"▾"  },
  { id:"checkbox"  as FieldType, label:"Checkbox",     icon:"☑"  },
  { id:"radio"     as FieldType, label:"Radio",        icon:"◉"  },
  { id:"date"      as FieldType, label:"Date Picker",  icon:"📅" },
  { id:"file"      as FieldType, label:"File Upload",  icon:"📎" },
  { id:"textarea"  as FieldType, label:"Text Area",    icon:"¶"  },
  { id:"button"    as FieldType, label:"Button",       icon:"⬡"  },
];

const DEP_ACTIONS = ["show","hide","enable","disable","require"] as const;

// ═══════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function Badge({ children, color }: { children: ReactNode; color?: ColorScheme }): JSX.Element {
  return <span style={{
    padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:.5,
    background:color?.bg||C.highlight, color:color?.text||C.textDim,
    border:`1px solid ${color?.border||C.border}`, display:"inline-block", whiteSpace:"nowrap",
  }}>{children}</span>;
}

function Spinner(): JSX.Element {
  return <span style={{
    display:"inline-block", width:12, height:12, marginRight:6,
    border:`2px solid ${C.border}`, borderTop:`2px solid ${C.accent}`,
    borderRadius:"50%", animation:"spin .7s linear infinite", verticalAlign:"middle",
  }}/>;
}

function SkeletonRow({ i }: { i: number }): JSX.Element {
  return <tr>{[70,100,150,180,200,120,180,110,80,90,90,80].map((w,j)=>(
    <td key={j} style={{padding:"10px",borderBottom:`1px solid ${C.border}22`,background:i%2===0?C.surface:C.bg}}>
      <div style={{height:9,borderRadius:4,background:`linear-gradient(90deg,${C.border},${C.borderHover},${C.border})`,backgroundSize:"200% 100%",animation:`shimmer 1.5s ease ${j*.05}s infinite`,minWidth:w*.4,maxWidth:w}}/>
    </td>
  ))}</tr>;
}

function ButtonPreview({ field }: { field: Field }): JSX.Element {
  const action = field.buttonAction||"custom";
  const variant = field.buttonVariant||"primary";
  const vc = BTN_VARIANT_C[variant];
  const icon = action==="submit"?"✓":action==="cancel"?"✕":"▶";
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 16px",borderRadius:5,fontSize:11,fontWeight:700,background:vc.bg,color:vc.text,border:`1px solid ${vc.border}`,cursor:"default",opacity:.85}}>{icon} {field.label}</span>;
}

function SectionTitle({ label }: { label: string }): JSX.Element {
  return <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8,marginTop:14,display:"flex",alignItems:"center",gap:8}}>
    {label}<div style={{flex:1,height:1,background:C.border}}/>
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFF ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function diffVersions(prev: BuildVersion, curr: { fields: Field[]; moduleName: string; globalValidations: string }): DiffResult {
  const prevIds = new Set(prev.fields.map(f=>f.id));
  const currIds = new Set(curr.fields.map(f=>f.id));
  const addedFields   = curr.fields.filter(f=>!prevIds.has(f.id)).map(f=>f.label);
  const removedFields = prev.fields.filter(f=>!currIds.has(f.id)).map(f=>f.label);
  const modifiedFields: string[] = [];
  const validationChanges: string[] = [];
  const dependencyChanges: string[] = [];
  curr.fields.forEach(cf => {
    const pf = prev.fields.find(f=>f.id===cf.id);
    if (!pf) return;
    if (pf.label!==cf.label || pf.mandatory!==cf.mandatory || pf.type!==cf.type) modifiedFields.push(cf.label);
    if (JSON.stringify(pf.validation)!==JSON.stringify(cf.validation)) validationChanges.push(`${cf.label} validation updated`);
    if ((pf.customValidations||[]).join()!==(cf.customValidations||[]).join()) validationChanges.push(`${cf.label} custom rules updated`);
    if (JSON.stringify(pf.dependencies||[])!==JSON.stringify(cf.dependencies||[])) dependencyChanges.push(`${cf.label} dependencies changed`);
    if (JSON.stringify(pf.conditions||[])!==JSON.stringify(cf.conditions||[])) validationChanges.push(`${cf.label} button conditions changed`);
  });
  return { addedFields, removedFields, modifiedFields, validationChanges, dependencyChanges };
}

function emptyDiff(): DiffResult {
  return { addedFields:[], removedFields:[], modifiedFields:[], validationChanges:[], dependencyChanges:[] };
}

function hasDiffChanges(d: DiffResult): boolean {
  return d.addedFields.length+d.removedFields.length+d.modifiedFields.length+d.validationChanges.length+d.dependencyChanges.length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFF PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function DiffPanel({ diff, prevVer, currVer, deltaTCs, regressionTCs, onClose }: {
  diff: DiffResult; prevVer: number; currVer: number;
  deltaTCs: number; regressionTCs: number; onClose: ()=>void;
}): JSX.Element {
  return (
    <div className="diff-panel">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:10,color:C.yellow,fontWeight:700,letterSpacing:2}}>🔍 CHANGE DETECTION — v{prevVer} → v{currVer}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
      </div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:10}}>
        {diff.addedFields.length>0    && <div><span style={{color:C.green,  fontWeight:700}}>+ Added:</span>      <span style={{color:C.textDim}}>{diff.addedFields.join(", ")}</span></div>}
        {diff.removedFields.length>0  && <div><span style={{color:C.red,    fontWeight:700}}>− Removed:</span>    <span style={{color:C.textDim}}>{diff.removedFields.join(", ")}</span></div>}
        {diff.modifiedFields.length>0 && <div><span style={{color:C.yellow, fontWeight:700}}>~ Modified:</span>   <span style={{color:C.textDim}}>{diff.modifiedFields.join(", ")}</span></div>}
        {diff.validationChanges.length>0 && <div><span style={{color:C.purple,fontWeight:700}}>⚙ Validation:</span> <span style={{color:C.textDim}}>{diff.validationChanges.join(", ")}</span></div>}
        {diff.dependencyChanges.length>0 && <div><span style={{color:C.teal,  fontWeight:700}}>⇄ Deps:</span>      <span style={{color:C.textDim}}>{diff.dependencyChanges.join(", ")}</span></div>}
        {!hasDiffChanges(diff) && <div style={{color:C.muted}}>No structural changes — regression suite generated</div>}
      </div>
      <div style={{marginTop:8,fontSize:10,color:C.muted}}>
        Delta TCs: <strong style={{color:C.yellow}}>{deltaTCs}</strong>
        &nbsp;·&nbsp; Regression TCs: <strong style={{color:C.green}}>{regressionTCs}</strong>
        &nbsp;·&nbsp; <span style={{color:C.textDim,fontSize:9}}>Delta = new/changed fields · Regression = unchanged features still work</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONS TAB COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function VersionsTab({ versions, currentVersion, onExportVersion }: {
  versions: BuildVersion[]; currentVersion: number; onExportVersion: (v: BuildVersion)=>void;
}): JSX.Element {
  if (versions.length===0) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.muted,padding:60}}>
      <div style={{fontSize:52,marginBottom:16,opacity:.15}}>🗂</div>
      <div style={{fontSize:14,marginBottom:8,color:C.textDim}}>No versions yet</div>
      <div style={{fontSize:11,opacity:.6}}>Click <strong style={{color:C.green}}>🧱 Build</strong> to create v1</div>
      <div style={{fontSize:10,color:C.muted,marginTop:10}}>Developed by QA Rajendra</div>
    </div>
  );

  return (
    <div style={{padding:"18px 20px",overflowY:"auto",height:"calc(100vh - 60px)"}}>
      <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:16}}>BUILD HISTORY — {versions.length} VERSION{versions.length!==1?"S":""}</div>

      {/* Workflow diagram */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 16px",marginBottom:20,fontSize:10,color:C.textDim}}>
        <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>WORKFLOW</div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {["Add Fields","Configure Validations","Add Dependencies","Click 🧱 Build","Form Locked","Version Saved","Test Cases Generated"].map((step,i,arr)=>(
            <span key={step} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{padding:"3px 10px",borderRadius:4,background:C.highlight,border:`1px solid ${C.accent}33`,color:C.accent,fontSize:9,fontWeight:700}}>{step}</span>
              {i<arr.length-1&&<span style={{color:C.muted,fontSize:10}}>→</span>}
            </span>
          ))}
        </div>
        <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:9,color:C.yellow,fontWeight:700}}>ITERATE:</span>
          {["Unlock Form","Modify Fields","Click 🔄 Iterate","Compare Versions","Generate Delta + Regression TCs"].map((step,i,arr)=>(
            <span key={step} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{padding:"3px 10px",borderRadius:4,background:"#1a1000",border:`1px solid ${C.yellow}33`,color:C.yellow,fontSize:9}}>{step}</span>
              {i<arr.length-1&&<span style={{color:C.muted,fontSize:10}}>→</span>}
            </span>
          ))}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {[...versions].reverse().map(v=>{
          const isActive = v.version===currentVersion;
          const cl = v.changeLog;
          const deltaTCs = v.testCases.filter(t=>t.category==="Delta").length;
          const regTCs   = v.testCases.filter(t=>t.category==="Regression").length;
          const catCounts: Record<string,number> = {};
          v.testCases.forEach(tc=>{ catCounts[tc.category]=(catCounts[tc.category]||0)+1; });

          return (
            <div key={v.version} style={{background:C.card,border:`1px solid ${isActive?C.accentGlow:C.border}`,borderRadius:10,padding:18,position:"relative"}}>
              {isActive && <div style={{position:"absolute",top:12,right:14,fontSize:9,color:C.accent,fontWeight:700,letterSpacing:2,background:C.accentDim,border:`1px solid ${C.accentGlow}`,padding:"2px 9px",borderRadius:20}}>ACTIVE</div>}

              {/* Version header */}
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
                <div style={{width:46,height:46,borderRadius:9,background:isActive?`linear-gradient(135deg,${C.accent},#0055cc)`:C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${isActive?C.accent:C.border}`}}>
                  <span style={{fontFamily:"'Exo 2',sans-serif",fontSize:17,fontWeight:900,color:isActive?"#000":C.textDim}}>v{v.version}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{v.moduleName}</div>
                  <div style={{fontSize:10,color:C.muted,marginBottom:6}}>Built {v.timestamp}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Badge color={{bg:C.accentDim,text:C.accent,border:"#003060"}}>{v.fields.length} fields</Badge>
                    <Badge color={{bg:C.greenDim,text:C.green,border:"#004030"}}>{v.testCases.length} test cases</Badge>
                    {deltaTCs>0 && <Badge color={CATEGORY_C.Delta}>{deltaTCs} delta</Badge>}
                    {regTCs>0   && <Badge color={CATEGORY_C.Regression}>{regTCs} regression</Badge>}
                  </div>
                </div>
                <button className="btn btn-s" style={{flexShrink:0}} onClick={()=>onExportVersion(v)}>⬇ Export v{v.version}</button>
              </div>

              {/* Changelog */}
              {hasDiffChanges(cl) && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>CHANGES FROM PREVIOUS VERSION</div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:10,background:C.bg,borderRadius:6,padding:"10px 14px",border:`1px solid ${C.border}`}}>
                    {cl.addedFields.length>0    && <div><span style={{color:C.green,  fontWeight:700}}>+ Added:</span>      <span style={{color:C.textDim}}> {cl.addedFields.join(", ")}</span></div>}
                    {cl.removedFields.length>0  && <div><span style={{color:C.red,    fontWeight:700}}>− Removed:</span>    <span style={{color:C.textDim}}> {cl.removedFields.join(", ")}</span></div>}
                    {cl.modifiedFields.length>0 && <div><span style={{color:C.yellow, fontWeight:700}}>~ Modified:</span>   <span style={{color:C.textDim}}> {cl.modifiedFields.join(", ")}</span></div>}
                    {cl.validationChanges.length>0 && <div><span style={{color:C.purple,fontWeight:700}}>⚙ Validation:</span> <span style={{color:C.textDim}}> {cl.validationChanges.join(", ")}</span></div>}
                    {cl.dependencyChanges.length>0 && <div><span style={{color:C.teal,  fontWeight:700}}>⇄ Deps:</span>      <span style={{color:C.textDim}}> {cl.dependencyChanges.join(", ")}</span></div>}
                  </div>
                </div>
              )}

              {/* TC breakdown by category */}
              <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>TEST CASES BY CATEGORY</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                {Object.entries(catCounts).map(([cat,n])=>(
                  <Badge key={cat} color={CATEGORY_C[cat]||undefined}>{cat}: {n}</Badge>
                ))}
              </div>

              {/* Fields list */}
              <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>FIELDS IN THIS VERSION</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {v.fields.map(f=>(
                  <span key={f.id} style={{fontSize:10,padding:"2px 9px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,color:C.text}}>
                    {f.label} <span style={{color:C.muted}}>({f.type})</span>
                  </span>
                ))}
              </div>

              {/* Priority breakdown */}
              <div style={{marginTop:12,display:"flex",gap:10,fontSize:10,color:C.textDim}}>
                {(["High","Medium","Low"] as Priority[]).map(p=>{
                  const n=v.testCases.filter(t=>t.priority===p).length;
                  return n>0?<span key={p}><Badge color={PRIORITY_C[p]}>{p}: {n}</Badge></span>:null;
                })}
                {(["Pending","Pass","Fail","Blocked"] as Status[]).map(s=>{
                  const n=v.testCases.filter(t=>t.status===s).length;
                  return n>0?<span key={s}><Badge color={STATUS_C[s]}>{s}: {n}</Badge></span>:null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App(): JSX.Element {
  const [apiKey,         setApiKey]         = useState<string>("");
  const [showKey,        setShowKey]        = useState<boolean>(false);
  const [fields,         setFields]         = useState<Field[]>([]);
  const [module,         setModule]         = useState<string>("Login Form");
  const [testCases,      setTestCases]      = useState<TestCase[]>([]);
  const [loading,        setLoading]        = useState<boolean>(false);
  const [loadingPhase,   setLoadingPhase]   = useState<string>("");
  const [error,          setError]          = useState<string>("");
  const [tab,            setTab]            = useState<TabType>("builder");
  const [selected,       setSelected]       = useState<number|null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority|"All">("All");
  const [filterStatus,   setFilterStatus]   = useState<Status|"All">("All");
  const [filterCategory, setFilterCategory] = useState<TCCategory>("All");
  const [filterVersion,  setFilterVersion]  = useState<number|"All">("All");
  const [globalValidations, setGlobalValidations] = useState<string>("");
  const [testCaseCount,  setTestCaseCount]  = useState<number>(20);

  const TC_TYPES = [
    "Positive","Negative","Edge","Boundary","Functional","Security","Performance","Regression","UI","Integration"
  ] as const;
  type TCType = (typeof TC_TYPES)[number];

  const [testCaseTypeCounts, setTestCaseTypeCounts] = useState<Record<TCType, number>>(() => {
    const initial = {} as Record<TCType, number>;
    TC_TYPES.forEach(t => initial[t] = 0);
    return initial;
  });

  // Auth hooks
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sumTypeCounts = (): number => Object.values(testCaseTypeCounts).reduce((s, v) => s + (Number(v) || 0), 0);

  // Build / version state
  const [buildState,    setBuildState]    = useState<BuildState>("idle");
  const [versions,      setVersions]      = useState<BuildVersion[]>([]);
  const [currentVersion,setCurrentVersion]= useState<number>(0);
  const [lastDiff,      setLastDiff]      = useState<DiffResult|null>(null);
  const [showDiffPanel, setShowDiffPanel] = useState<boolean>(false);

  const xlsxLoaded = useRef<boolean>(false);
  const tableRef   = useRef<HTMLTableElement|null>(null);

  const isLocked = buildState === "locked";

  // ─────────────────────────────────────────────────────────────────────────
  // FIELD CRUD (blocked when locked)
  // ─────────────────────────────────────────────────────────────────────────
  const addField = (type: FieldType): void => {
    if (isLocked) return;
    const ft = FIELD_TYPES.find(f=>f.id===type);
    if (!ft) return;
    const isBtn = type==="button";
    setFields(p=>[...p,{
      id:Date.now(), type, label:isBtn?"Save":ft.label,
      mandatory:false, validation:{},
      options:["dropdown","checkbox","radio"].includes(type)?["Option 1","Option 2"]:[],
      buttonAction:isBtn?"submit":undefined,
      buttonVariant:isBtn?"primary":undefined,
      conditions:isBtn?[]:undefined,
      customValidations:[],
      dependencies:[],
      defaultValue:"",
    }]);
  };

  const removeField = (id: number): void => {
    if (isLocked) return;
    setFields(p=>p.filter(f=>f.id!==id));
    if (selected===id) setSelected(null);
  };

  const updateField = (id: number, u: Partial<Field>): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===id?{...f,...u}:f));
  };

  const updateVal = (id: number, k: string, v: unknown): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===id?{...f,validation:{...f.validation,[k]:v}}:f));
  };

  const addOpt    = (id: number): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===id?{...f,options:[...f.options,`Option ${f.options.length+1}`]}:f)); };
  const updateOpt = (id: number, i: number, v: string): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===id?{...f,options:f.options.map((o,j)=>j===i?v:o)}:f)); };
  const removeOpt = (id: number, i: number): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===id?{...f,options:f.options.filter((_,j)=>j!==i)}:f)); };

  // Condition CRUD
  const addCondition = (fieldId: number): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fieldId?{...f,conditions:[...(f.conditions||[]),{
      id:Date.now(), ifLabel:"",
      thenAction:f.buttonAction==="cancel"?"Cancel the operation and discard all changes":"Save the data and proceed to next step",
      elseAction:f.buttonAction==="cancel"?"Keep the form open and continue editing":"Show validation errors and keep the form open",
    }]}:f));
  };
  const updateCondition = (fid: number, cid: number, u: Partial<ConditionBranch>): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fid?{...f,conditions:(f.conditions||[]).map(c=>c.id===cid?{...c,...u}:c)}:f));
  };
  const removeCondition = (fid: number, cid: number): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fid?{...f,conditions:(f.conditions||[]).filter(c=>c.id!==cid)}:f));
  };

  // Custom validation CRUD
  const addCV    = (fid: number): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===fid?{...f,customValidations:[...(f.customValidations||[]),""]}: f)); };
  const updateCV = (fid: number, idx: number, v: string): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===fid?{...f,customValidations:(f.customValidations||[]).map((r,i)=>i===idx?v:r)}:f)); };
  const removeCV = (fid: number, idx: number): void => { if(isLocked)return; setFields(p=>p.map(f=>f.id===fid?{...f,customValidations:(f.customValidations||[]).filter((_,i)=>i!==idx)}:f)); };

  // Dependency CRUD
  const addDep = (fid: number): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fid?{...f,dependencies:[...(f.dependencies||[]),{
      id:Date.now(), sourceFieldId:null, triggerValue:"", action:"show" as const, targetFieldId:null,
    }]}:f));
  };
  const updateDep = (fid: number, did: number, u: Partial<Dependency>): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fid?{...f,dependencies:(f.dependencies||[]).map(d=>d.id===did?{...d,...u}:d)}:f));
  };
  const removeDep = (fid: number, did: number): void => {
    if (isLocked) return;
    setFields(p=>p.map(f=>f.id===fid?{...f,dependencies:(f.dependencies||[]).filter(d=>d.id!==did)}:f));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PROMPT BUILDER (your original logic — untouched)
  // ─────────────────────────────────────────────────────────────────────────
  const buildFieldDesc = (flds: Field[]): string => {
    return flds.map(f=>{
      let s=`${f.label} [type:${f.type}, mandatory:${f.mandatory}`;
      if(f.defaultValue) s+=`, defaultValue:"${f.defaultValue}"`;
      if(Object.keys(f.validation).length) s+=`, validation:${JSON.stringify(f.validation)}`;
      if(f.options?.length) s+=`, options:[${f.options.join(", ")}]`;
      if(f.type==="button"){
        s+=`, buttonAction:${f.buttonAction}, variant:${f.buttonVariant}`;
        if(f.conditions?.length){
          const cs=f.conditions.map((c,ci)=>`[C${ci+1}] IF(${c.ifLabel||"clicked"}) THEN(${c.thenAction}) ELSE(${c.elseAction})`).join("; ");
          s+=`, conditionalLogic:[${cs}]`;
        }
      }
      if((f.customValidations||[]).filter(Boolean).length)
        s+=`, customRules:[${f.customValidations!.filter(Boolean).join("; ")}]`;
      if((f.dependencies||[]).length){
        const ds=(f.dependencies||[]).map(d=>{
          const src=flds.find(x=>x.id===d.sourceFieldId)?.label||"?";
          const tgt=flds.find(x=>x.id===d.targetFieldId)?.label||"?";
          return `IF ${src}="${d.triggerValue}" THEN ${d.action} ${tgt}`;
        }).join("; ");
        s+=`, dependencies:[${ds}]`;
      }
      return s+"]";
    }).join("\n");
  };

  const autoDetectDependencies = (flds: Field[]): string => {
    const hints: string[] = [];
    const labels = flds.map(f=>f.label.toLowerCase());
    if(labels.some(l=>l.includes("password")) && labels.some(l=>l.includes("confirm")))
      hints.push("Confirm Password field must match Password field");
    if(labels.some(l=>l.includes("country")) && labels.some(l=>l.includes("state")))
      hints.push("State/Province dropdown options depend on selected Country");
    const dateFields = flds.filter(f=>f.type==="date");
    if(dateFields.length>=2)
      hints.push(`Date field ordering: ${dateFields.map(f=>f.label).join(" must be before/after ")}`);
    if(labels.some(l=>l.includes("dob")||l.includes("birth")))
      hints.push("Date of Birth must be in the past and user must be at least 18 years old");
    const checkboxes = flds.filter(f=>f.type==="checkbox");
    checkboxes.forEach(cb=>{ hints.push(`When checkbox "${cb.label}" is checked → verify dependent fields become enabled/visible`); });
    const radios = flds.filter(f=>f.type==="radio");
    radios.forEach(r=>{ if(r.options.length) hints.push(`Radio "${r.label}" selection (${r.options.join("/")}): verify correct show/hide of dependent sections`); });
    return hints.join("\n");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CORE BUILD — your original Groq API call + Build/Iterate orchestration
  // ─────────────────────────────────────────────────────────────────────────
  const handleBuild = async (): Promise<void> => {
    if (!apiKey.trim()) { setError("Please enter your Groq API key."); return; }
    if (!fields.length) { setError("Add at least one field first."); return; }

    const prevVersion    = versions.length > 0 ? versions[versions.length-1] : null;
    const newVersionNum  = (prevVersion?.version||0)+1;
    const isIteration    = prevVersion !== null;

    // Step 1: Lock
    setBuildState("locked");
    setSelected(null);
    setError("");
    setLoading(true);
    setLoadingPhase(`Step 1/3 — Locking form as v${newVersionNum}…`);

    // Compute diff
    let diff: DiffResult = emptyDiff();
    if (prevVersion) {
      diff = diffVersions(prevVersion, { fields, moduleName:module, globalValidations });
      setLastDiff(diff);
    }

    // Step 2: snapshot
    const snapshot: BuildVersion = {
      version: newVersionNum,
      timestamp: new Date().toLocaleString(),
      moduleName: module,
      fields: JSON.parse(JSON.stringify(fields)),
      globalValidations,
      testCases: [],
      changeLog: diff,
    };
    setCurrentVersion(newVersionNum);
    setTab("testcases");

    // Step 3: Generate via Groq (YOUR ORIGINAL API LOGIC — UNTOUCHED)
    setLoadingPhase(`Step 2/3 — ${isIteration?"Comparing with v"+prevVersion!.version+"…":"Analysing fields…"}`);
    await new Promise(r=>setTimeout(r,400));
    setLoadingPhase(`Step 3/3 — AI generating test cases for v${newVersionNum}…`);

    try {
      const desc       = buildFieldDesc(fields);
      const autoHints  = autoDetectDependencies(fields);
      const globalRules = globalValidations.trim() ? `\nGlobal validation rules:\n${globalValidations.trim()}` : "";
      const autoDepHints = autoHints ? `\nAuto-detected cross-field dependencies:\n${autoHints}` : "";
      const buttonFields = fields.filter(f=>f.type==="button");
      const buttonInstr  = buttonFields.length>0 ? `\nFor buttons: generate test cases for each IF/ELSE condition branch, cancel discarding data, submit with valid/invalid data.` : "";

      const iterationContext = isIteration && diff
        ? `\nThis is ITERATION v${newVersionNum} (previous was v${prevVersion!.version}).
Changes detected:
- Added fields: ${diff.addedFields.join(", ")||"none"}
- Removed fields: ${diff.removedFields.join(", ")||"none"}
- Modified fields: ${diff.modifiedFields.join(", ")||"none"}
- Validation changes: ${diff.validationChanges.join(", ")||"none"}
- Dependency changes: ${diff.dependencyChanges.join(", ")||"none"}

For CHANGED/ADDED items → generate Delta test cases (category="Delta").
For UNCHANGED items → generate Regression test cases (category="Regression").
For everything else → generate Functional/Validation/Boundary/Negative/Dependency test cases.`
        : "";

      // ── YOUR ORIGINAL GROQ API CALL (not modified) ──
      const perTypeTotal = sumTypeCounts();
      const effectiveCount = perTypeTotal > 0 ? perTypeTotal : testCaseCount;
      const breakdown = perTypeTotal > 0
        ? "\nBREAKDOWN BY TYPE:\n" + TC_TYPES.map(t => `${t}: ${testCaseTypeCounts[t]}`).join("\n") + "\n"
        : "";

      const prompt = `You are a senior QA engineer. Generate ${effectiveCount} comprehensive test cases for a UI form module named "${module}" (Build v${newVersionNum}).\n\n${breakdown}
    \nFIELDS:
    ${desc}
    ${globalRules}${autoDepHints}${buttonInstr}${iterationContext}
    \nTEST CASE COVERAGE REQUIRED:
1. Functional – happy path, correct data submission
2. Validation – field-level: required, min/max length, format, regex, file type/size, default value
3. Boundary – min, max, min-1, max+1, empty, null, whitespace-only
4. Negative – invalid data, wrong format, SQL injection, XSS strings, very long input
5. Dependency – cross-field rules (confirm password, date ordering, conditional visibility, checkbox/radio triggers)
6. Button logic – enable/disable state, if/else branches, cancel vs submit outcomes
${isIteration ? "7. Delta – new/changed fields only\n8. Regression – unchanged fields verify they still work" : ""}

SEVERITY auto-assign: Critical=auth/submit, Major=validation, Minor=UI/format

RESPOND ONLY with a raw JSON array. No markdown, no code fences, no explanation.

Format:
[{"id":"TC001","module":"${module}","scenario":"...","description":"...","steps":"Step 1: ...\\nStep 2: ...","testData":"...","expected":"...","actual":"","priority":"High","status":"Pending","category":"Functional","severity":"Major"}]

priority: High|Medium|Low  status: Pending  category: Functional|Validation|Boundary|Negative|Dependency|Regression|Delta  severity: Critical|Major|Minor`;

      // ── YOUR ORIGINAL GROQ FETCH (not modified) ──
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey.trim()}`},
        body:JSON.stringify({
          model:"llama-3.3-70b-versatile",
          temperature:0.25,
          max_tokens:6000,
          messages:[
            {role:"system",content:"You are a senior QA engineer. Always respond with raw JSON only. No markdown. No code fences."},
            {role:"user",content:prompt},
          ],
        }),
      });

      if (!res.ok){
        const errData=await res.json().catch(()=>({}));
        throw new Error((errData as {error?:{message?:string}})?.error?.message||`HTTP ${res.status}`);
      }

      const data = await res.json();
      let raw = (data.choices?.[0]?.message?.content as string)||"[]";
      raw = raw.replace(/```json|```/gi,"").trim();
      const start=raw.indexOf("["), end=raw.lastIndexOf("]");
      if(start!==-1&&end>start) raw=raw.slice(start,end+1);
      else throw new Error("Invalid JSON from AI — no array found.");

      const parsed = JSON.parse(raw) as TestCase[];
      if(!Array.isArray(parsed)||parsed.length===0) throw new Error("AI returned empty test cases.");

      const numbered = parsed.map((tc,i)=>({
        ...tc,
        id:`TC${String(i+1).padStart(3,"0")}`,
        rowId: Date.now()+i,           // unique across versions
        priority:(["High","Medium","Low"] as Priority[]).includes(tc.priority)?tc.priority:"Medium" as Priority,
        status:"Pending" as Status,
        category:tc.category||"Functional",
        severity:tc.severity||"Major",
        versionTag:`v${newVersionNum}`,
      }));

      // ── Accumulate TCs (keep previous versions' TCs + new ones)
      setTestCases(prev => {
        const kept = isIteration ? prev : [];   // fresh on v1, accumulate on iterations
        return [...kept, ...numbered];
      });
      setFilterPriority("All");
      setFilterStatus("All");
      setFilterCategory("All");
      setFilterVersion(newVersionNum);

      snapshot.testCases = numbered;
      setVersions(p=>[...p, snapshot]);
      if(isIteration) setShowDiffPanel(true);

    } catch(e){
      setError("Error: "+(e instanceof Error?e.message:"Unknown error"));
      setBuildState("idle");
    } finally {
      setLoading(false);
      setLoadingPhase("");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UNLOCK & ITERATE
  // ─────────────────────────────────────────────────────────────────────────
  const handleUnlock = (): void => {
    setBuildState("unlocked");
    setShowDiffPanel(false);
    setTab("builder");
  };

  const handleIterate = (): void => {
    setBuildState("idle");
    handleBuild();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE TC
  // ─────────────────────────────────────────────────────────────────────────
  const updateTC = (rowId: number, k: keyof TestCase, v: string): void =>
    setTestCases(p=>p.map(tc=>tc.rowId===rowId?{...tc,[k]:v}:tc));

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT XLSX — now with version sheet + metadata
  // ─────────────────────────────────────────────────────────────────────────
  const exportXLSX = useCallback((versionOverride?: BuildVersion):void=>{
    const casesToExport = versionOverride ? versionOverride.testCases : filteredCases;
    const doExport = ()=>{
      const XLSX=(window as unknown as {XLSX: {utils:{book_new:()=>unknown;aoa_to_sheet:(d:unknown[][])=>unknown;book_append_sheet:(wb:unknown,ws:unknown,n:string)=>void};writeFile:(wb:unknown,n:string)=>void}}).XLSX;
      const headers=["ID","Version","Module","Scenario","Description","Test Steps","Test Data","Expected","Actual","Priority","Status","Category","Severity"];
      const rows=casesToExport.map(tc=>[tc.id,tc.versionTag||"v1",tc.module,tc.scenario,tc.description,tc.steps,tc.testData,tc.expected,tc.actual,tc.priority,tc.status,tc.category,tc.severity||""]);
      const wb=XLSX.utils.book_new();
      const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
      (ws as unknown as {["!cols"]: unknown[]})["!cols"]=[{wch:10},{wch:7},{wch:14},{wch:26},{wch:32},{wch:36},{wch:20},{wch:30},{wch:20},{wch:9},{wch:9},{wch:12},{wch:10}];
      XLSX.utils.book_append_sheet(wb,ws,versionOverride?`v${versionOverride.version} Test Cases`:"Test Cases");

      // Per-version sheets (for full export)
      if (!versionOverride && versions.length>0) {
        versions.forEach(v=>{
          const vTCs = testCases.filter(t=>t.versionTag===`v${v.version}`);
          if (!vTCs.length) return;
          const vws=XLSX.utils.aoa_to_sheet([headers,...vTCs.map(tc=>[tc.id,tc.versionTag||`v${v.version}`,tc.module,tc.scenario,tc.description,tc.steps,tc.testData,tc.expected,tc.actual,tc.priority,tc.status,tc.category,tc.severity||""])]);
          XLSX.utils.book_append_sheet(wb,vws,`v${v.version}`);
        });
        // Build history sheet
        const mh=["Version","Timestamp","Module","Field Count","TC Count","Added","Removed","Modified"];
        const mr=versions.map(v=>[`v${v.version}`,v.timestamp,v.moduleName,v.fields.length,v.testCases.length,v.changeLog.addedFields.join(", ")||"-",v.changeLog.removedFields.join(", ")||"-",v.changeLog.modifiedFields.join(", ")||"-"]);
        const ws2=XLSX.utils.aoa_to_sheet([mh,...mr]);
        XLSX.utils.book_append_sheet(wb,ws2,"Build History");
      }

      const fname = versionOverride
        ? `${module.replace(/\s+/g,"_")}_v${versionOverride.version}_TestCases.xlsx`
        : `${module.replace(/\s+/g,"_")}_v${currentVersion}_All_TestCases.xlsx`;
      XLSX.writeFile(wb,fname);
    };
    if((window as unknown as {XLSX:unknown}).XLSX){ doExport(); }
    else if(!xlsxLoaded.current){
      xlsxLoaded.current=true;
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload=doExport;
      s.onerror=()=>{ xlsxLoaded.current=false; setError("Failed to load XLSX library."); };
      document.head.appendChild(s);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[testCases,module,versions,currentVersion]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────
  const filteredCases = testCases.filter(tc=>{
    if(filterPriority!=="All" && tc.priority!==filterPriority) return false;
    if(filterStatus!=="All"   && tc.status!==filterStatus)     return false;
    if(filterCategory!=="All" && tc.category!==filterCategory) return false;
    if(filterVersion!=="All"  && tc.versionTag!==`v${filterVersion}`) return false;
    return true;
  });

  const passCount    = testCases.filter(t=>t.status==="Pass").length;
  const failCount    = testCases.filter(t=>t.status==="Fail").length;
  const pendingCount = testCases.filter(t=>t.status==="Pending").length;
  const passRate     = testCases.length>0?Math.round((passCount/testCases.length)*100):0;

  const catCounts: Record<string,number> = {};
  filteredCases.forEach(tc=>{ catCounts[tc.category]=(catCounts[tc.category]||0)+1; });
  const allVersionTags = [...new Set(testCases.map(t=>t.versionTag||"v1"))].sort();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white" style={{fontFamily:"'JetBrains Mono','Fira Code',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Exo+2:wght@400;700;900&display=swap');
        *,*::before,*::after{box-sizing:border-box} body{margin:0}
        #root{max-width:none!important;margin:0!important;padding:0!important;text-align:left!important}
        :root{
          --bg:#070a12; --surface:#0b0f1c; --card:#0f1524; --cardHover:#131a2e;
          --border:#1c2a42; --borderHover:#2a3f60;
          --accent:#00d4ff; --accentDim:#00d4ff18; --accentGlow:#00d4ff44;
          --green:#00e5a0; --greenDim:#00e5a015;
          --yellow:#ffc847; --yellowDim:#ffc84715;
          --red:#ff4d6d; --redDim:#ff4d6d15;
          --orange:#ff8c42; --orangeDim:#ff8c4215;
          --purple:#b57cff; --purpleDim:#b57cff15;
          --teal:#00c9a7; --tealDim:#00c9a715;
          --text:#c8d8ee; --textDim:#7a90b0; --muted:#3d5270; --highlight:#0d1e38;
        }
        .dark {
          --bg:#ffffff; --surface:#f0f0f0; --card:#ffffff; --cardHover:#e0e0e0;
          --border:#cccccc; --borderHover:#aaaaaa;
          --accent:#0066cc; --accentDim:#0066cc18; --accentGlow:#0066cc44;
          --green:#008855; --greenDim:#00885515;
          --yellow:#cca300; --yellowDim:#cca30015;
          --red:#cc3344; --redDim:#cc334415;
          --orange:#cc6633; --orangeDim:#cc663315;
          --purple:#8844cc; --purpleDim:#8844cc15;
          --teal:#008b80; --tealDim:#008b8015;
          --text:#111111; --textDim:#555555; --muted:#777777; --highlight:#dddddd;
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lockPulse{0%,100%{box-shadow:0 0 0 0 ${C.yellow}44}50%{box-shadow:0 0 0 6px ${C.yellow}00}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.surface}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${C.borderHover}}
        .fc{transition:all .18s ease}
        .fc:hover:not(.locked-field){border-color:${C.accentGlow}!important}
        .tc-row:hover td{background:${C.highlight}!important}
        .btn{font-family:inherit;cursor:pointer;border-radius:5px;font-size:11px;font-weight:700;letter-spacing:.8px;transition:all .18s;border:none;display:inline-flex;align-items:center;gap:4px}
        .btn-a{background:linear-gradient(135deg,${C.accent},#0090ff);color:#000;padding:8px 18px}
        .btn-a:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:0 4px 18px ${C.accentGlow}}
        .btn-a:disabled{opacity:.3;cursor:not-allowed;transform:none;filter:none;box-shadow:none}
        .btn-build{background:linear-gradient(135deg,${C.green},#0090aa);color:#000;padding:9px 22px;font-size:12px}
        .btn-build:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 4px 20px ${C.tealDim}}
        .btn-build:disabled{opacity:.3;cursor:not-allowed;transform:none;filter:none;box-shadow:none}
        .btn-iterate{background:linear-gradient(135deg,${C.yellow},${C.orange});color:#000;padding:9px 22px;font-size:12px}
        .btn-iterate:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn-iterate:disabled{opacity:.3;cursor:not-allowed;transform:none}
        .btn-unlock{background:transparent;color:${C.yellow};border:1px solid #4a3800;padding:8px 16px}
        .btn-unlock:hover{background:${C.yellowDim};border-color:#8a6000}
        .btn-g{background:transparent;color:${C.textDim};border:1px solid ${C.border};padding:7px 14px}
        .btn-g:hover{border-color:${C.accent};color:${C.accent};background:${C.accentDim}}
        .btn-s{background:transparent;color:${C.green};border:1px solid #004030;padding:7px 16px}
        .btn-s:hover{background:${C.greenDim};border-color:#00a070}
        .btn-d{background:transparent;color:${C.red};border:1px solid #4a1525;padding:4px 9px;font-size:10px}
        .btn-d:hover{background:${C.redDim};border-color:#7a2040}
        .btn-p{background:transparent;color:${C.purple};border:1px solid #3a2060;padding:4px 9px;font-size:10px}
        .btn-p:hover{background:${C.purpleDim};border-color:#6a40a0}
        .btn-t{background:transparent;color:${C.teal};border:1px solid #004038;padding:4px 9px;font-size:10px}
        .btn-t:hover{background:${C.tealDim};border-color:#007060}
        input,select,textarea{background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:5px 9px;border-radius:4px;font-family:inherit;font-size:11px;outline:none;transition:border .15s,box-shadow .15s}
        input:focus,select:focus,textarea:focus{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentDim}}
        input:disabled,select:disabled,textarea:disabled{opacity:.4;cursor:not-allowed}
        select option{background:${C.surface}}
        .tab{padding:7px 18px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;font-family:inherit;letter-spacing:.8px;transition:all .18s;display:inline-flex;align-items:center;gap:6px}
        .tab-on{background:${C.accent};color:#000;box-shadow:0 2px 12px ${C.accentGlow};border-color:transparent}
        .tab-off{background:transparent;color:${C.textDim};border-color:${C.border}}
        .tab-off:hover{color:${C.text};border-color:${C.borderHover};background:${C.card}}
        td input,td select,td textarea{width:100%;box-sizing:border-box;font-size:10px}
        .glow{text-shadow:0 0 24px ${C.accent}88}
        .ft-row{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;margin-bottom:5px;background:${C.card};border-radius:5px;border:1px solid ${C.border};transition:all .15s}
        .ft-row:hover{border-color:${C.borderHover};background:${C.cardHover}}
        .stat-card{background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;display:flex;flex-direction:column;gap:4px;min-width:88px}
        .chip{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${C.border};background:transparent;color:${C.textDim};font-family:inherit;transition:all .15px;letter-spacing:.5px}
        .chip:hover{border-color:${C.borderHover};color:${C.text}}
        .chip.on{border-color:${C.accent};color:${C.accent};background:${C.accentDim}}
        .cond-block{background:${C.bg};border:1px solid ${C.border};border-radius:6px;padding:10px 12px;margin-bottom:8px;animation:slideDown .15s ease}
        .dep-block{background:#050810;border:1px solid #1a2840;border-radius:6px;padding:10px 12px;margin-bottom:8px;animation:slideDown .15s ease}
        .cv-row{display:flex;align-items:center;gap:6px;margin-bottom:6px;animation:fadeUp .12s ease}
        .if-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#0a1830;color:${C.accent};border:1px solid #1a3060;white-space:nowrap}
        .then-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#001e14;color:${C.green};border:1px solid #004030;white-space:nowrap}
        .else-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#1e1200;color:${C.orange};border:1px solid #4a2a00;white-space:nowrap}
        .lock-banner{background:linear-gradient(90deg,#1a1000,#1a1400,#1a1000);border:1px solid #5a4000;border-radius:7px;padding:10px 16px;margin-bottom:10px;display:flex;align-items:center;gap:10px;animation:lockPulse 2s ease infinite}
        .diff-panel{background:#050c10;border:1px solid #1a3040;border-radius:8px;padding:14px 18px;margin-bottom:12px;animation:slideDown .2s ease}
        .version-chip{padding:3px 10px;border-radius:4px;font-size:9px;font-weight:700;background:#001830;color:${C.accent};border:1px solid #003060;cursor:pointer;transition:all .15s}
        .version-chip:hover{background:#002040;border-color:#0060a0}
        .version-chip.active{background:#003060;border-color:${C.accent}}
        .locked-field{opacity:.6;pointer-events:none}
        .phase-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#001020;border:1px solid #1a3050;border-radius:20px;font-size:10px;color:${C.accent}}
      `}</style>

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:7,background:`linear-gradient(135deg,${C.accent},#0055cc)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#000",boxShadow:`0 2px 12px ${C.accentGlow}`}}>⚡</div>
          <div>
            <div className="glow" style={{fontFamily:"'Exo 2',sans-serif",fontSize:15,fontWeight:900,letterSpacing:2.5,color:C.accent,lineHeight:1.2}}>QA-AutoGenerate-TestCases</div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:3}}>GROQ · LLAMA 3.3-70B · BUILD · VERSION · DELTA · REGRESSION</div>
          </div>
        </div>

        {/* API Key */}
        <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",flex:1,maxWidth:360}}>
          <span style={{fontSize:11,color:C.muted}}>🔑</span>
          <input type={showKey?"text":"password"} placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" value={apiKey}
            onChange={(e:ChangeEvent<HTMLInputElement>)=>setApiKey(e.target.value)}
            style={{flex:1,border:"none",background:"transparent",fontSize:11,padding:"2px 0",outline:"none",boxShadow:"none"}}/>
          <button className="btn btn-g" style={{padding:"2px 8px",fontSize:9,border:"none"}} onClick={()=>setShowKey(p=>!p)}>{showKey?"HIDE":"SHOW"}</button>
        </div>
        <div  onClick={()=>window.open("https://console.groq.com", "_blank")} style={{fontSize:9,color:C.muted,lineHeight:1.6,flexShrink:0,marginLeft:10,cursor:"pointer"}}>Free at <span style={{color:C.accent}}>console.groq.com</span></div>

        {/* Build state badges */}
        {buildState==="locked" && (
          <div style={{display:"flex",alignItems:"center",gap:8,background:"#0f0a00",border:`1px solid #4a3800`,borderRadius:6,padding:"5px 12px",flexShrink:0}}>
            <span style={{fontSize:12}}>🔒</span>
            <span style={{fontSize:10,color:C.yellow,fontWeight:700}}>LOCKED · v{currentVersion}</span>
          </div>
        )}
        {buildState==="unlocked" && (
          <div style={{display:"flex",alignItems:"center",gap:8,background:"#00100a",border:`1px solid #004030`,borderRadius:6,padding:"5px 12px",flexShrink:0}}>
            <span style={{fontSize:12}}>🔓</span>
            <span style={{fontSize:10,color:C.green,fontWeight:700}}>UNLOCKED · EDITING v{currentVersion+1}</span>
          </div>
        )}

        {/* Version pills */}
        {versions.length>0 && (
          <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",maxWidth:220}}>
            {versions.map(v=>(
              <span key={v.version} className={`version-chip ${v.version===currentVersion?"active":""}`}
                onClick={()=>{setFilterVersion(v.version);setTab("testcases");}}>
                v{v.version} · {v.testCases.length}TC
              </span>
            ))}
          </div>
        )}

        <div style={{marginLeft:"auto",display:"flex",gap:6,flexShrink:0,alignItems:'center'}}>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="tab tab-off"
            style={{padding:"6px 12px",fontSize:11,fontWeight:600,color:C.red,border:`1px solid ${C.red}33`}}
            title="Sign out"
          >
            🚪 LOGOUT
          </button>
          <button className={`tab ${tab==="builder"?"tab-on":"tab-off"}`} onClick={()=>setTab("builder")}>
            ⚙ BUILDER {fields.length>0&&<span style={{background:tab==="builder"?"#00000033":C.accentDim,padding:"1px 6px",borderRadius:10,fontSize:9}}>{fields.length}</span>}
          </button>
          <button className={`tab ${tab==="testcases"?"tab-on":"tab-off"}`} onClick={()=>setTab("testcases")}>
            📋 TESTS {testCases.length>0&&<span style={{background:tab==="testcases"?"#00000033":C.accentDim,padding:"1px 6px",borderRadius:10,fontSize:9}}>{testCases.length}</span>}
          </button>
          <button className={`tab ${tab==="versions"?"tab-on":"tab-off"}`} onClick={()=>setTab("versions")}>
            🗂 VERSIONS {versions.length>0&&<span style={{background:tab==="versions"?"#00000033":C.accentDim,padding:"1px 6px",borderRadius:10,fontSize:9}}>{versions.length}</span>}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════ BUILDER TAB ═══════════════════════════ */}
      {tab==="builder" && (
        <div style={{display:"flex",height:"calc(100vh - 60px)",overflow:"hidden"}}>

          {/* LEFT palette */}
          <div style={{width:210,background:C.surface,borderRight:`1px solid ${C.border}`,padding:14,overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column"}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:10}}>FIELD TYPES</div>
            {FIELD_TYPES.map(ft=>{
              const isBtn=ft.id==="button";
              return (
                <div key={ft.id} className="ft-row" style={isBtn?{borderColor:"#3a2060",background:"#0c0a1a"}:{}}>
                  <span style={{fontSize:11,color:isBtn?C.purple:C.text}}><span style={{marginRight:7,opacity:.8}}>{ft.icon}</span>{ft.label}</span>
                  <button className={`btn ${isBtn?"btn-p":"btn-a"}`}
                    style={{padding:"2px 9px",fontSize:12,minWidth:26,justifyContent:"center",opacity:isLocked?.4:1}}
                    onClick={()=>addField(ft.id)} disabled={isLocked} title={isLocked?"Form is locked — Unlock to add fields":""}>+</button>
                </div>
              );
            })}

            <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>AI GENERATION SETTINGS</div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:8,marginBottom:8}}>🧠 Test Cases to Generate (total):</label>
                <input type="number" value={testCaseCount} onChange={(e:ChangeEvent<HTMLInputElement>)=>setTestCaseCount(Math.max(1,parseInt(e.target.value)||1))}
                  disabled={isLocked} min={1} max={500} style={{width:"100%",fontSize:11,padding:"6px 8px",marginBottom:8}}/>
                <div style={{fontSize:8,color:C.muted,marginBottom:8,lineHeight:1.4}}>Higher = more test cases, slower generation. You can also set per-type counts below; their sum will override the total if &gt; 0.</div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(1,1fr)",gap:8,marginTop:6}}>
                  {TC_TYPES.map(t=> (
                    <label key={t} style={{fontSize:11,color:C.textDim,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{minWidth:80}}>{t}</span>
                      <input type="number" value={testCaseTypeCounts[t]} min={0} onChange={(e:ChangeEvent<HTMLInputElement>)=>{
                        const v = Math.max(0, parseInt(e.target.value)||0);
                        setTestCaseTypeCounts(prev=>({ ...prev, [t]: v }));
                      }} style={{width:80,padding:"4px 6px",fontSize:11}} disabled={isLocked}/>
                    </label>
                  ))}
                </div>
                <div style={{fontSize:8,color:C.muted,marginTop:8}}>Per-type total: {sumTypeCounts()} (if &gt; 0 will override total)</div>
              </div>

              <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>GLOBAL VALIDATION RULES</div>
              <div style={{fontSize:9,color:C.muted,marginBottom:6,lineHeight:1.5,opacity:.8}}>Custom rules injected into every AI generation.</div>
              <textarea value={globalValidations} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>setGlobalValidations(e.target.value)}
                disabled={isLocked}
                placeholder={"e.g.\nPassword: 8+ chars, 1 special\nEmail must be unique\nAll fields required on submit"}
                rows={5} style={{width:"100%",fontSize:10,resize:"vertical",lineHeight:1.6}}/>
            </div>

            {/* Build History (sidebar) */}
            {versions.length>0 && (
              <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>BUILD HISTORY</div>
                {versions.map(v=>(
                  <div key={v.version} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,cursor:"pointer"}}
                    onClick={()=>{setFilterVersion(v.version);setTab("testcases");}}>
                    <span className={`version-chip ${v.version===currentVersion?"active":""}`}>v{v.version}</span>
                    <span style={{fontSize:9,color:C.muted}}>{v.fields.length}f · {v.testCases.length}TC</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CENTER canvas */}
          <div style={{flex:1,padding:"18px 20px",overflowY:"auto", background:C.bg}}>
            {/* Toolbar */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${isLocked?"#4a3800":C.border}`,borderRadius:6,padding:"5px 14px"}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,whiteSpace:"nowrap"}}>MODULE</span>
                <input type="text" value={module} disabled={isLocked}
                  onChange={(e:ChangeEvent<HTMLInputElement>)=>setModule(e.target.value)}
                  style={{border:"none",background:"transparent",outline:"none",boxShadow:"none",fontSize:12,fontWeight:600,width:190,color:isLocked?C.yellow:C.text}}/>
              </div>
              {fields.length>0&&!isLocked&&(
                <span style={{fontSize:10,color:C.muted}}>
                  {fields.length} fields · {fields.filter(f=>f.mandatory).length} mandatory · {fields.filter(f=>f.type==="button").length} btn
                </span>
              )}
              <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
                {loading && <div className="phase-badge"><Spinner/>{loadingPhase}</div>}

                {!isLocked && buildState!=="unlocked" && (
                  <button className="btn btn-build" onClick={handleBuild} disabled={loading||!fields.length||!apiKey.trim()}>
                    {loading?<><Spinner/>Building…</>:"🧱 Build"}
                  </button>
                )}
                {buildState==="unlocked" && (
                  <>
                    <button className="btn btn-g" style={{fontSize:10}} onClick={()=>setBuildState("locked")}>✕ Cancel</button>
                    <button className="btn btn-iterate" onClick={handleIterate} disabled={loading||!fields.length||!apiKey.trim()}>
                      {loading?<><Spinner/>Iterating…</>:"🔄 Iterate"}
                    </button>
                  </>
                )}
                {isLocked && (
                  <button className="btn btn-unlock" onClick={handleUnlock}>🔓 Unlock & Edit</button>
                )}
              </div>
            </div>

            {/* Lock banner */}
            {isLocked && (
              <div className="lock-banner">
                <span style={{fontSize:16}}>🔒</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:C.yellow,fontWeight:700}}>Form locked — Build v{currentVersion} active</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>Fields are read-only. Click "Unlock & Edit" to start a new iteration with change detection.</div>
                </div>
                <button className="btn btn-g" style={{fontSize:10}} onClick={()=>setTab("testcases")}>View Test Cases →</button>
                <button className="btn btn-g" style={{fontSize:10}} onClick={()=>setTab("versions")}>View Versions →</button>
              </div>
            )}

            {error && (
              <div style={{background:C.redDim,border:`1px solid #4a1525`,color:C.red,padding:"10px 14px",borderRadius:6,marginBottom:12,fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                ⚠ {error}
                <button onClick={()=>setError("")} style={{marginLeft:"auto",background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
              </div>
            )}

            {!fields.length ? (
              <div style={{textAlign:"center",padding:"70px 40px",color:C.muted}}>
                <div style={{fontSize:52,marginBottom:16,opacity:.15}}>⊕</div>
                <div style={{fontSize:14,marginBottom:8,color:C.textDim}}>No fields added yet</div>
                <div style={{fontSize:11,opacity:.6}}>Click <strong style={{color:C.accent}}>+</strong> next to any field type on the left</div>
                <div style={{marginTop:20,fontSize:10,color:C.muted,lineHeight:1.8,maxWidth:420,margin:"20px auto 0"}}>
                  💡 <strong style={{color:C.textDim}}>Workflow:</strong> Add Fields → Configure → Add Dependencies → Click <strong style={{color:C.green}}>🧱 Build</strong> → Form locked → v1 saved → Test cases generated
                  <br/><strong style={{color:C.yellow}}>To iterate:</strong> Unlock → Modify → Click <strong style={{color:C.yellow}}>🔄 Iterate</strong> → Delta + Regression TCs generated
                </div>
              </div>
            ) : (
              fields.map((field,i)=>{
                const isBtn=field.type==="button";
                const hasDeps=(field.dependencies||[]).length>0;
                return (
                  <div key={field.id} className={`fc ${isLocked?"locked-field":""}`}
                    onClick={()=>!isLocked&&setSelected(field.id===selected?null:field.id)}
                    style={{
                      background:selected===field.id?C.highlight:isBtn?"#0c0a18":C.card,
                      border:`1px solid ${selected===field.id?isBtn?`${C.purple}88`:`${C.accent}66`:isBtn?"#3a2060":C.border}`,
                      borderRadius:7,padding:"12px 15px",marginBottom:7,cursor:isLocked?"default":"pointer",animation:"fadeUp .18s ease",
                    }}>

                    {/* Field header */}
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{color:isBtn?C.purple:C.accent,fontSize:11,fontWeight:700,fontFamily:"'Exo 2',sans-serif",opacity:.6,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
                      {isBtn?<ButtonPreview field={field}/>:<span style={{fontSize:12,fontWeight:600,color:C.text}}>{field.label}</span>}
                      <Badge color={isBtn?{bg:C.purpleDim,text:C.purple,border:"#3a2060"}:undefined}>{field.type}</Badge>
                      {field.mandatory&&<Badge color={{bg:"#001833",text:C.accent,border:"#003060"}}>required</Badge>}
                      {isBtn&&field.buttonAction&&<Badge color={{bg:field.buttonAction==="cancel"?C.redDim:field.buttonAction==="submit"?C.greenDim:C.accentDim,text:field.buttonAction==="cancel"?C.red:field.buttonAction==="submit"?C.green:C.accent,border:field.buttonAction==="cancel"?"#4a1525":field.buttonAction==="submit"?"#004030":C.border}}>{field.buttonAction}</Badge>}
                      {(field.conditions||[]).length>0&&<Badge color={{bg:C.yellowDim,text:C.yellow,border:"#4a3800"}}>{(field.conditions||[]).length} condition{(field.conditions||[]).length!==1?"s":""}</Badge>}
                      {hasDeps&&<Badge color={{bg:C.tealDim,text:C.teal,border:"#004038"}}>{(field.dependencies||[]).length} dep{(field.dependencies||[]).length!==1?"s":""}</Badge>}
                      {(field.customValidations||[]).filter(Boolean).length>0&&<Badge color={{bg:C.purpleDim,text:C.purple,border:"#3a2060"}}>{(field.customValidations||[]).filter(Boolean).length} rule{(field.customValidations||[]).filter(Boolean).length!==1?"s":""}</Badge>}
                      <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}} onClick={(e:MouseEvent<HTMLDivElement>)=>e.stopPropagation()}>
                        {!isBtn&&!isLocked&&(
                          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.textDim,cursor:"pointer",userSelect:"none"}}>
                            <input type="checkbox" checked={field.mandatory} style={{accentColor:C.accent}}
                              onChange={(e:ChangeEvent<HTMLInputElement>)=>updateField(field.id,{mandatory:e.target.checked})}/>
                            Mandatory
                          </label>
                        )}
                        {!isLocked&&<button className="btn btn-d" onClick={()=>removeField(field.id)}>✕ Remove</button>}
                        {!isLocked&&<span style={{fontSize:11,color:C.muted,transform:selected===field.id?"rotate(180deg)":"rotate(0deg)",display:"inline-block",transition:"transform .15s"}}>▾</span>}
                        {isLocked&&<span style={{fontSize:9,color:C.muted,opacity:.5}}>🔒</span>}
                      </div>
                    </div>

                    {/* Expanded config */}
                    {selected===field.id&&!isLocked&&(
                      <div style={{marginTop:12,paddingTop:12,borderTop:`1px dashed ${C.border}`}}
                        onClick={(e:MouseEvent<HTMLDivElement>)=>e.stopPropagation()}>

                        {/* ── BUTTON CONFIG ── */}
                        {isBtn&&(
                          <>
                            <SectionTitle label="BUTTON SETTINGS"/>
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Label:
                                <input type="text" value={field.label} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateField(field.id,{label:e.target.value})} style={{width:130}}/>
                              </label>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Action:
                                <select value={field.buttonAction||"custom"} onChange={(e:ChangeEvent<HTMLSelectElement>)=>{
                                  const act=e.target.value as ButtonAction;
                                  updateField(field.id,{buttonAction:act,label:act==="submit"?"Save":act==="cancel"?"Cancel":field.label,buttonVariant:act==="cancel"?"secondary":act==="submit"?"primary":field.buttonVariant});
                                }} style={{width:110}}>
                                  <option value="submit">Submit / Save</option>
                                  <option value="cancel">Cancel</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </label>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Style:
                                <select value={field.buttonVariant||"primary"} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateField(field.id,{buttonVariant:e.target.value as "primary"|"secondary"|"danger"})} style={{width:110}}>
                                  <option value="primary">Primary (Blue)</option>
                                  <option value="secondary">Secondary</option>
                                  <option value="danger">Danger (Red)</option>
                                </select>
                              </label>
                            </div>
                            {field.buttonAction==="cancel"&&<div style={{fontSize:10,color:C.yellow,background:C.yellowDim,border:`1px solid #4a3800`,borderRadius:5,padding:"7px 10px",marginTop:8,lineHeight:1.6}}>💡 <strong>Cancel:</strong> AI will generate test cases verifying all form changes are discarded.</div>}
                            {field.buttonAction==="submit"&&<div style={{fontSize:10,color:C.green,background:C.greenDim,border:`1px solid #004030`,borderRadius:5,padding:"7px 10px",marginTop:8,lineHeight:1.6}}>💡 <strong>Save/Submit:</strong> AI will generate test cases verifying validation runs and data saves.</div>}

                            <SectionTitle label="IF / ELSE CONDITIONAL LOGIC"/>
                            {(field.conditions||[]).map((cond,ci)=>(
                              <div key={cond.id} className="cond-block">
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                                  <span style={{fontSize:9,color:C.purple,letterSpacing:2,fontWeight:700}}>CONDITION {ci+1}</span>
                                  <button className="btn btn-d" style={{padding:"2px 7px"}} onClick={()=>removeCondition(field.id,cond.id)}>✕</button>
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="if-badge" style={{marginTop:6}}>IF</span>
                                    <textarea value={cond.ifLabel} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>updateCondition(field.id,cond.id,{ifLabel:e.target.value})} placeholder="Describe the condition…" rows={2} style={{flex:1,fontSize:10,resize:"vertical"}}/>
                                  </div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="then-badge" style={{marginTop:6}}>THEN</span>
                                    <textarea value={cond.thenAction} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>updateCondition(field.id,cond.id,{thenAction:e.target.value})} placeholder="What happens when true?" rows={2} style={{flex:1,fontSize:10,resize:"vertical"}}/>
                                  </div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="else-badge" style={{marginTop:6}}>ELSE</span>
                                    <textarea value={cond.elseAction} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>updateCondition(field.id,cond.id,{elseAction:e.target.value})} placeholder="What happens otherwise?" rows={2} style={{flex:1,fontSize:10,resize:"vertical"}}/>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button className="btn btn-p" style={{fontSize:10,marginBottom:4}} onClick={()=>addCondition(field.id)}>+ Add If/Else Condition</button>
                          </>
                        )}

                        {/* ── REGULAR FIELD CONFIG ── */}
                        {!isBtn&&(
                          <>
                            <SectionTitle label="FIELD SETTINGS"/>
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Label:
                                <input type="text" value={field.label} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateField(field.id,{label:e.target.value})} style={{width:150}}/>
                              </label>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Default:
                                <input type="text" value={field.defaultValue||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateField(field.id,{defaultValue:e.target.value})} style={{width:100}} placeholder="(none)"/>
                              </label>
                              {["text","password","email","textarea"].includes(field.type)&&<>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Min Len:
                                  <input type="number" value={(field.validation.minLength as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"minLength",e.target.value)} style={{width:55}}/>
                                </label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Max Len:
                                  <input type="number" value={(field.validation.maxLength as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"maxLength",e.target.value)} style={{width:55}}/>
                                </label>
                              </>}
                              {field.type==="text"&&<label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Regex:
                                <input type="text" value={(field.validation.regex as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"regex",e.target.value)} style={{width:130}} placeholder="[a-zA-Z0-9]*"/>
                              </label>}
                              {field.type==="number"&&<>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Min: <input type="number" value={(field.validation.min as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"min",e.target.value)} style={{width:60}}/></label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Max: <input type="number" value={(field.validation.max as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"max",e.target.value)} style={{width:60}}/></label>
                              </>}
                              {field.type==="password"&&<label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                <input type="checkbox" checked={(field.validation.specialChar as boolean)||false} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"specialChar",e.target.checked)} style={{accentColor:C.accent}}/>
                                Require Special Char
                              </label>}
                              {field.type==="file"&&<>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Types:
                                  <input type="text" value={(field.validation.fileTypes as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"fileTypes",e.target.value)} style={{width:120}} placeholder=".pdf,.jpg,.png"/>
                                </label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>Max MB:
                                  <input type="number" value={(field.validation.maxMB as string)||""} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"maxMB",e.target.value)} style={{width:55}}/>
                                </label>
                              </>}
                              {field.type==="date"&&<>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                  <input type="checkbox" checked={(field.validation.pastOnly as boolean)||false} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"pastOnly",e.target.checked)} style={{accentColor:C.accent}}/>
                                  Past dates only (DOB)
                                </label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                  <input type="checkbox" checked={(field.validation.futureOnly as boolean)||false} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateVal(field.id,"futureOnly",e.target.checked)} style={{accentColor:C.accent}}/>
                                  Future dates only
                                </label>
                              </>}
                            </div>
                            {["dropdown","checkbox","radio"].includes(field.type)&&(
                              <div style={{marginTop:10}}>
                                <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>OPTIONS</div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                                  {field.options.map((opt,idx)=>(
                                    <div key={idx} style={{display:"flex",alignItems:"center",gap:4}}>
                                      <input type="text" value={opt} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateOpt(field.id,idx,e.target.value)} style={{width:110}}/>
                                      <button className="btn btn-d" style={{padding:"3px 7px"}} onClick={()=>removeOpt(field.id,idx)}>✕</button>
                                    </div>
                                  ))}
                                  <button className="btn btn-g" style={{fontSize:10}} onClick={()=>addOpt(field.id)}>+ Add Option</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── CROSS-FIELD DEPENDENCIES ── */}
                        <SectionTitle label="CROSS-FIELD DEPENDENCIES"/>
                        <div style={{fontSize:9,color:C.muted,marginBottom:8,lineHeight:1.5}}>IF [source field] = "value" THEN [action] [target field]</div>
                        {(field.dependencies||[]).map(dep=>(
                          <div key={dep.id} className="dep-block">
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                              <span className="if-badge">IF</span>
                              <select value={dep.sourceFieldId||""} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateDep(field.id,dep.id,{sourceFieldId:Number(e.target.value)||null})} style={{width:130,fontSize:10}}>
                                <option value="">— select field —</option>
                                {fields.filter(f=>f.id!==field.id).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
                              </select>
                              <span style={{fontSize:10,color:C.muted}}>=</span>
                              <input type="text" value={dep.triggerValue} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateDep(field.id,dep.id,{triggerValue:e.target.value})} placeholder="value / checked / true" style={{width:110,fontSize:10}}/>
                              <span className="then-badge">THEN</span>
                              <select value={dep.action} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateDep(field.id,dep.id,{action:e.target.value as Dependency["action"]})} style={{width:90,fontSize:10}}>
                                {DEP_ACTIONS.map(a=><option key={a}>{a}</option>)}
                              </select>
                              <select value={dep.targetFieldId||""} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateDep(field.id,dep.id,{targetFieldId:Number(e.target.value)||null})} style={{width:130,fontSize:10}}>
                                <option value="">— target field —</option>
                                {fields.filter(f=>f.id!==field.id).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
                              </select>
                              <button className="btn btn-d" style={{padding:"3px 7px",marginLeft:"auto"}} onClick={()=>removeDep(field.id,dep.id)}>✕</button>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-t" style={{fontSize:10,marginBottom:4}} onClick={()=>addDep(field.id)}>+ Add Dependency Rule</button>

                        {/* ── CUSTOM VALIDATION RULES ── */}
                        <SectionTitle label="CUSTOM VALIDATION RULES"/>
                        <div style={{fontSize:9,color:C.muted,marginBottom:8,lineHeight:1.5}}>Field-specific rules injected into AI prompt.</div>
                        {(field.customValidations||[]).map((rule,idx)=>(
                          <div key={idx} className="cv-row">
                            <span style={{fontSize:10,color:C.purple,fontWeight:700,minWidth:20,opacity:.7}}>#{idx+1}</span>
                            <input type="text" value={rule} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateCV(field.id,idx,e.target.value)}
                              placeholder={isBtn?"e.g. Button disabled until all required fields are filled":"e.g. Must not contain special characters"}
                              style={{flex:1,fontSize:10}}/>
                            <button className="btn btn-d" style={{padding:"3px 7px"}} onClick={()=>removeCV(field.id,idx)}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-g" style={{fontSize:10,marginTop:2}} onClick={()=>addCV(field.id)}>+ Add Validation Rule</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════ TEST CASES TAB ═══════════════════════════ */}
      {tab==="testcases"&&(
        <div style={{padding:"14px 16px",height:"calc(100vh - 60px)",display:"flex",flexDirection:"column",gap:10 ,background:C.bg}}>

          {/* Top bar */}
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>
              {testCases.length>0?`${filteredCases.length}/${testCases.length} TEST CASES — ${module.toUpperCase()} · v${currentVersion}`:loading?"BUILDING…":"NO TEST CASES"}
            </span>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {loading&&<span style={{fontSize:11,color:C.textDim,display:"flex",alignItems:"center"}}><Spinner/>{loadingPhase||"Generating…"}</span>}
              <button className="btn btn-g" onClick={()=>setTab("builder")}>← Builder</button>
              {testCases.length>0&&<button className="btn btn-s" onClick={()=>exportXLSX()}>⬇ Export XLSX</button>}
              {isLocked&&<button className="btn btn-unlock" onClick={handleUnlock} style={{fontSize:11}}>🔓 Unlock & Iterate</button>}
            </div>
          </div>

          {error&&(
            <div style={{background:C.redDim,border:`1px solid #4a1525`,color:C.red,padding:"10px 14px",borderRadius:6,fontSize:11,display:"flex",alignItems:"center",gap:8}}>
              ⚠ {error}
              <button onClick={()=>setError("")} style={{marginLeft:"auto",background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
            </div>
          )}

          {/* Diff panel */}
          {showDiffPanel&&lastDiff&&(
            <DiffPanel
              diff={lastDiff}
              prevVer={currentVersion-1}
              currVer={currentVersion}
              deltaTCs={testCases.filter(t=>t.category==="Delta"&&t.versionTag===`v${currentVersion}`).length}
              regressionTCs={testCases.filter(t=>t.category==="Regression"&&t.versionTag===`v${currentVersion}`).length}
              onClose={()=>setShowDiffPanel(false)}
            />
          )}

          {/* Stats + filters */}
          {testCases.length>0&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"stretch"}}>
              <div className="stat-card">
                <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>PASS RATE</span>
                <span style={{fontSize:22,fontWeight:700,fontFamily:"'Exo 2',sans-serif",color:passRate>=70?C.green:passRate>=40?C.yellow:C.red}}>{passRate}%</span>
              </div>
              <div className="stat-card">
                <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>PENDING</span>
                <span style={{fontSize:22,fontWeight:700,fontFamily:"'Exo 2',sans-serif",color:C.textDim}}>{pendingCount}</span>
              </div>
              <div className="stat-card">
                <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>PASSED</span>
                <span style={{fontSize:22,fontWeight:700,fontFamily:"'Exo 2',sans-serif",color:C.green}}>{passCount}</span>
              </div>
              <div className="stat-card" style={{borderColor:failCount>0?"#4a1525":C.border}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2}}>FAILED</span>
                <span style={{fontSize:22,fontWeight:700,fontFamily:"'Exo 2',sans-serif",color:C.red}}>{failCount}</span>
              </div>

              {/* Version filter */}
              {allVersionTags.length>1&&(
                <div className="stat-card" style={{minWidth:180}}>
                  <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>VERSION</span>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    <button className={`chip ${filterVersion==="All"?"on":""}`} onClick={()=>setFilterVersion("All")}>All</button>
                    {allVersionTags.map(vt=>(
                      <button key={vt} className={`chip ${filterVersion!=="All"&&`v${filterVersion}`===vt?"on":""}`}
                        onClick={()=>setFilterVersion(parseInt(vt.replace("v","")))}>{vt}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category filter */}
              <div className="stat-card" style={{flex:3,minWidth:300}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>CATEGORY</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(["All","Functional","Validation","Boundary","Negative","Dependency","Regression","Delta"] as TCCategory[]).map(cat=>(
                    <button key={cat} className={`chip ${filterCategory===cat?"on":""}`}
                      style={cat!=="All"&&CATEGORY_C[cat]&&filterCategory===cat?{borderColor:CATEGORY_C[cat].text!,color:CATEGORY_C[cat].text!,background:CATEGORY_C[cat].bg}:{}}
                      onClick={()=>setFilterCategory(cat)}>
                      {cat==="All"?"All":`${cat} (${testCases.filter(t=>t.category===cat).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority filter */}
              <div className="stat-card" style={{flex:2,minWidth:200}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>PRIORITY</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(["All","High","Medium","Low"] as (Priority|"All")[]).map(p=>(
                    <button key={p} className={`chip ${filterPriority===p?"on":""}`} onClick={()=>setFilterPriority(p)}>
                      {p==="All"?"All":`${p} (${testCases.filter(t=>t.priority===p).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div className="stat-card" style={{flex:2,minWidth:220}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>STATUS</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(["All","Pending","Pass","Fail","Blocked"] as (Status|"All")[]).map(s=>(
                    <button key={s} className={`chip ${filterStatus===s?"on":""}`} onClick={()=>setFilterStatus(s)}>
                      {s==="All"?"All":`${s} (${testCases.filter(t=>t.status===s).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!testCases.length&&!loading?(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.muted}}>
              <div style={{fontSize:52,marginBottom:16,opacity:.15}}>📋</div>
              <div style={{fontSize:14,marginBottom:8,color:C.textDim}}>No test cases yet</div>
              <div style={{fontSize:11,marginBottom:24,opacity:.6}}>Go to Builder → add fields → click <strong style={{color:C.green}}>🧱 Build</strong></div>
              <button className="btn btn-g" onClick={()=>setTab("builder")}>← Open Builder</button>
            </div>
          ):(
            <div style={{flex:1,overflowX:"auto",overflowY:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}} ref={tableRef}>
                <thead>
                  <tr style={{background:C.card,position:"sticky",top:0,zIndex:2}}>
                    {["ID","Ver","Module","Scenario","Description","Test Steps","Test Data","Expected","Actual","Cat","Sev","Priority","Status"].map(h=>(
                      <th key={h} style={{padding:"9px 11px",textAlign:"left",color:C.muted,fontWeight:700,letterSpacing:1,fontSize:9,whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,background:C.card}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading&&testCases.length===0?(
                    Array.from({length:10}).map((_,i)=><SkeletonRow key={i} i={i}/>)
                  ):filteredCases.length===0?(
                    <tr><td colSpan={13} style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>
                      No test cases match the current filter.{" "}
                      <button onClick={()=>{setFilterPriority("All");setFilterStatus("All");setFilterCategory("All");setFilterVersion("All");}}
                        style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>Clear filters</button>
                    </td></tr>
                  ):(
                    filteredCases.map((tc,i)=>{
                      const catColor=CATEGORY_C[tc.category];
                      const bg=i%2===0?C.surface:C.bg;
                      const tdS=(extra?:object)=>({padding:"6px 10px",borderBottom:`1px solid ${C.border}22`,background:bg,verticalAlign:"top" as const,...extra});
                      return (
                        <tr key={tc.rowId} className="tc-row" style={{animation:`fadeUp .1s ease ${i*.015}s both`}}>
                          <td style={tdS({minWidth:70})}>
                            <span style={{color:C.accent,fontWeight:700,fontSize:11,fontFamily:"'Exo 2',sans-serif"}}>{tc.id}</span>
                          </td>
                          <td style={tdS({minWidth:40})}>
                            <Badge color={{bg:C.accentDim,text:C.accent,border:"#003060"}}>{tc.versionTag||"v1"}</Badge>
                          </td>
                          <td style={tdS({minWidth:90,maxWidth:110})}>
                            <input type="text" value={tc.module} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"module",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:150,maxWidth:200})}>
                            <input type="text" value={tc.scenario} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"scenario",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:170,maxWidth:210})}>
                            <input type="text" value={tc.description} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"description",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:200,maxWidth:260})}>
                            <textarea value={tc.steps} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>updateTC(tc.rowId,"steps",e.target.value)} rows={3} style={{resize:"vertical",lineHeight:1.5,fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:120,maxWidth:150})}>
                            <input type="text" value={tc.testData} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"testData",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:170,maxWidth:210})}>
                            <input type="text" value={tc.expected} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"expected",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:120,maxWidth:150})}>
                            <input type="text" value={tc.actual} onChange={(e:ChangeEvent<HTMLInputElement>)=>updateTC(tc.rowId,"actual",e.target.value)} style={{fontSize:10,width:"100%"}}/>
                          </td>
                          <td style={tdS({minWidth:90})}>
                            <Badge color={catColor}>{tc.category}</Badge>
                          </td>
                          <td style={tdS({minWidth:70})}>
                            <span style={{fontSize:9,fontWeight:700,color:tc.severity==="Critical"?C.red:tc.severity==="Major"?C.yellow:C.textDim}}>{tc.severity||"—"}</span>
                          </td>
                          <td style={tdS({minWidth:85})}>
                            <select value={tc.priority} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateTC(tc.rowId,"priority",e.target.value)} style={{marginBottom:4,width:"100%",fontSize:10}}>
                              {["High","Medium","Low"].map(o=><option key={o}>{o}</option>)}
                            </select>
                            <Badge color={PRIORITY_C[tc.priority]}>{tc.priority}</Badge>
                          </td>
                          <td style={tdS({minWidth:95})}>
                            <select value={tc.status} onChange={(e:ChangeEvent<HTMLSelectElement>)=>updateTC(tc.rowId,"status",e.target.value)} style={{marginBottom:4,width:"100%",fontSize:10}}>
                              {["Pending","Pass","Fail","Blocked"].map(o=><option key={o}>{o}</option>)}
                            </select>
                            <Badge color={STATUS_C[tc.status as Status]}>{tc.status}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {testCases.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:4,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
              <span style={{fontSize:9,color:C.muted}}>All cells editable · Update Actual &amp; Status after testing · v{currentVersion} · {testCases.length} total TCs across {versions.length} version{versions.length!==1?"s":""}</span>
              {(filterPriority!=="All"||filterStatus!=="All"||filterCategory!=="All"||filterVersion!=="All")&&(
                <button className="btn btn-g" style={{marginLeft:"auto",fontSize:9,padding:"3px 10px"}} onClick={()=>{setFilterPriority("All");setFilterStatus("All");setFilterCategory("All");setFilterVersion("All");}}>✕ Clear Filters</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ VERSIONS TAB ═══════════════════════════ */}
      {tab==="versions"&&(
        <VersionsTab versions={versions} currentVersion={currentVersion} onExportVersion={exportXLSX}/>
      )}
    </div>
  );
}