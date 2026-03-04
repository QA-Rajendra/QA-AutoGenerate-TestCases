import { useState, useRef, ReactNode, ChangeEvent, MouseEvent, useCallback } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────
type FieldType = "text" | "password" | "email" | "number" | "dropdown" | "checkbox" | "radio" | "date" | "file" | "textarea" | "button";
type ButtonAction = "submit" | "cancel" | "custom";
type Priority = "High" | "Medium" | "Low";
type Status = "Pending" | "Pass" | "Fail" | "Blocked";
type TabType = "builder" | "testcases";

// A single if/else condition branch on a button
interface ConditionBranch {
  id: number;
  ifLabel: string;       // "if [this condition]" — free text
  thenAction: string;    // "then [do this]" — free text
  elseAction: string;    // "else [do this]" — free text
}

interface Field {
  id: number;
  type: FieldType;
  label: string;
  mandatory: boolean;
  validation: Record<string, any>;
  options: string[];
  // Button-specific
  buttonAction?: ButtonAction;
  buttonVariant?: "primary" | "secondary" | "danger";
  conditions?: ConditionBranch[];
  // User-defined validation rules (all fields)
  customValidations?: string[];
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
  bg: "#070a12",
  surface: "#0b0f1c",
  card: "#0f1524",
  cardHover: "#131a2e",
  border: "#1c2a42",
  borderHover: "#2a3f60",
  accent: "#00d4ff",
  accentDim: "#00d4ff18",
  accentGlow: "#00d4ff44",
  green: "#00e5a0",
  greenDim: "#00e5a015",
  yellow: "#ffc847",
  yellowDim: "#ffc84715",
  red: "#ff4d6d",
  redDim: "#ff4d6d15",
  orange: "#ff8c42",
  orangeDim: "#ff8c4215",
  purple: "#b57cff",
  purpleDim: "#b57cff15",
  text: "#c8d8ee",
  textDim: "#7a90b0",
  muted: "#3d5270",
  highlight: "#0d1e38",
};

const PRIORITY_C: Record<Priority, ColorScheme> = {
  High:   { bg:"#1e0a10", text:"#ff4d6d", border:"#4a1525" },
  Medium: { bg:"#1e1800", text:"#ffc847", border:"#4a3800" },
  Low:    { bg:"#001e14", text:"#00e5a0", border:"#004030" },
};
const STATUS_C: Record<Status, ColorScheme> = {
  Pending: { bg:"#0a1525", text:"#5a8aaa", border:"#1c3050" },
  Pass:    { bg:"#001e14", text:"#00e5a0", border:"#004030" },
  Fail:    { bg:"#1e0a10", text:"#ff4d6d", border:"#4a1525" },
  Blocked: { bg:"#1e1200", text:"#ff8c42", border:"#4a2a00" },
};

const BTN_VARIANT_C = {
  primary:   { bg: C.accent,   text:"#000", border: C.accent   },
  secondary: { bg: C.surface,  text: C.textDim, border: C.border },
  danger:    { bg: C.red,      text: "#fff", border: C.red      },
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
  { id:"button",    label:"Button",        icon:"⬡" },
];

// ── SMALL COMPONENTS ───────────────────────────────────────────────────────
interface BadgeProps { children: ReactNode; color?: ColorScheme; }
function Badge({ children, color }: BadgeProps): JSX.Element {
  return (
    <span style={{
      padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:700,
      letterSpacing:.5, background:color?.bg || C.highlight,
      color:color?.text || C.textDim, border:`1px solid ${color?.border || C.border}`,
      display:"inline-block", whiteSpace:"nowrap",
    }}>{children}</span>
  );
}

function Spinner(): JSX.Element {
  return <span style={{
    display:"inline-block", width:12, height:12, marginRight:6,
    border:`2px solid ${C.border}`, borderTop:`2px solid ${C.accent}`,
    borderRadius:"50%", animation:"spin .7s linear infinite", verticalAlign:"middle",
  }}/>;
}

function SkeletonRow({ i }: { i: number }): JSX.Element {
  return (
    <tr>
      {[70,100,170,190,210,130,190,130,90,100].map((w, j) => (
        <td key={j} style={{ padding:"10px", borderBottom:`1px solid ${C.border}22`, background: i%2===0 ? C.surface : C.bg }}>
          <div style={{
            height:10, borderRadius:4,
            background:`linear-gradient(90deg,${C.border},${C.borderHover},${C.border})`,
            backgroundSize:"200% 100%", animation:`shimmer 1.5s ease ${j*0.05}s infinite`,
            minWidth:w*0.4, maxWidth:w,
          }}/>
        </td>
      ))}
    </tr>
  );
}

// Preview of a button as it would appear in a real form
function ButtonPreview({ field }: { field: Field }): JSX.Element {
  const action = field.buttonAction || "custom";
  const variant = field.buttonVariant || "primary";
  const vc = BTN_VARIANT_C[variant];
  const icon = action === "submit" ? "✓" : action === "cancel" ? "✕" : "▶";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"5px 16px", borderRadius:5, fontSize:11, fontWeight:700,
      background: vc.bg, color: vc.text, border:`1px solid ${vc.border}`,
      cursor:"default", opacity:.85,
    }}>{icon} {field.label}</span>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [apiKey,         setApiKey]         = useState<string>("");
  const [showKey,        setShowKey]        = useState<boolean>(false);
  const [fields,         setFields]         = useState<Field[]>([]);
  const [module,         setModule]         = useState<string>("Login Form");
  const [testCases,      setTestCases]      = useState<TestCase[]>([]);
  const [loading,        setLoading]        = useState<boolean>(false);
  const [error,          setError]          = useState<string>("");
  const [tab,            setTab]            = useState<TabType>("builder");
  const [selected,       setSelected]       = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [filterStatus,   setFilterStatus]   = useState<Status | "All">("All");
  // Global custom validation rules (shown as textarea in builder)
  const [globalValidations, setGlobalValidations] = useState<string>("");
  const xlsxScriptLoaded = useRef<boolean>(false);
  const tableRef = useRef<HTMLTableElement | null>(null);

  // ── Field CRUD ─────────────────────────────────────────────────────────
  const addField = (type: FieldType): void => {
    const ft = FIELD_TYPES.find(f => f.id === type);
    if (!ft) return;
    const isBtn = type === "button";
    setFields(p => [...p, {
      id: Date.now(), type, label: isBtn ? "Save" : ft.label,
      mandatory: false, validation: {},
      options: ["dropdown","checkbox","radio"].includes(type) ? ["Option 1","Option 2"] : [],
      buttonAction: isBtn ? "submit" : undefined,
      buttonVariant: isBtn ? "primary" : undefined,
      conditions: isBtn ? [] : undefined,
      customValidations: [],
    }]);
  };

  const removeField = (id: number): void => {
    setFields(p => p.filter(f => f.id !== id));
    if (selected === id) setSelected(null);
  };

  const updateField = (id: number, u: Partial<Field>): void =>
    setFields(p => p.map(f => f.id === id ? { ...f, ...u } : f));

  const updateVal = (id: number, k: string, v: any): void =>
    setFields(p => p.map(f => f.id === id ? { ...f, validation: { ...f.validation, [k]: v } } : f));

  const addOpt = (id: number): void =>
    setFields(p => p.map(f => f.id === id ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] } : f));

  const updateOpt = (id: number, i: number, v: string): void =>
    setFields(p => p.map(f => f.id === id ? { ...f, options: f.options.map((o, j) => j === i ? v : o) } : f));

  const removeOpt = (id: number, i: number): void =>
    setFields(p => p.map(f => f.id === id ? { ...f, options: f.options.filter((_, j) => j !== i) } : f));

  // ── Button condition CRUD ───────────────────────────────────────────────
  const addCondition = (fieldId: number): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      conditions: [...(f.conditions || []), {
        id: Date.now(),
        ifLabel: "",
        thenAction: f.buttonAction === "cancel" ? "Cancel the operation and discard all changes" : "Save the data and proceed to next step",
        elseAction: f.buttonAction === "cancel" ? "Keep the form open and continue editing" : "Show validation errors and keep the form open",
      }],
    } : f));

  const updateCondition = (fieldId: number, condId: number, u: Partial<ConditionBranch>): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      conditions: (f.conditions || []).map(c => c.id === condId ? { ...c, ...u } : c),
    } : f));

  const removeCondition = (fieldId: number, condId: number): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      conditions: (f.conditions || []).filter(c => c.id !== condId),
    } : f));

  // ── Custom field-level validation rule CRUD ────────────────────────────
  const addCustomValidation = (fieldId: number): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      customValidations: [...(f.customValidations || []), ""],
    } : f));

  const updateCustomValidation = (fieldId: number, idx: number, v: string): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      customValidations: (f.customValidations || []).map((r, i) => i === idx ? v : r),
    } : f));

  const removeCustomValidation = (fieldId: number, idx: number): void =>
    setFields(p => p.map(f => f.id === fieldId ? {
      ...f,
      customValidations: (f.customValidations || []).filter((_, i) => i !== idx),
    } : f));

  // ── Build prompt description from fields ───────────────────────────────
  const buildFieldDesc = (): string => {
    return fields.map(f => {
      let s = `${f.label} [type:${f.type}, mandatory:${f.mandatory}`;
      if (Object.keys(f.validation).length) s += `, validation:${JSON.stringify(f.validation)}`;
      if (f.options?.length) s += `, options:[${f.options.join(", ")}]`;
      if (f.type === "button") {
        s += `, buttonAction:${f.buttonAction}, variant:${f.buttonVariant}`;
        if (f.conditions && f.conditions.length > 0) {
          const condStr = f.conditions.map((c, ci) =>
            `[Condition ${ci+1}] IF (${c.ifLabel || "user clicks button"}) THEN (${c.thenAction}) ELSE (${c.elseAction})`
          ).join("; ");
          s += `, conditionalLogic:[${condStr}]`;
        }
      }
      if (f.customValidations && f.customValidations.filter(Boolean).length > 0) {
        s += `, customRules:[${f.customValidations.filter(Boolean).join("; ")}]`;
      }
      return s + "]";
    }).join("\n");
  };

  // ── Generate via Groq ──────────────────────────────────────────────────
  async function generate(): Promise<void> {
    if (!apiKey.trim()) { setError("Please enter your Groq API key."); return; }
    if (!fields.length) { setError("Add at least one field first."); return; }
    setLoading(true);
    setError("");
    setTab("testcases");

    const desc = buildFieldDesc();
    const globalRules = globalValidations.trim()
      ? `\nAdditional validation rules to cover:\n${globalValidations.trim()}`
      : "";

    const buttonFields = fields.filter(f => f.type === "button");
    const buttonInstruction = buttonFields.length > 0
      ? `\nFor button fields with conditional logic, generate test cases covering:
- Each button's primary action (click and verify outcome)
- Each IF condition being TRUE → verify THEN action
- Each IF condition being FALSE → verify ELSE action
- Cancel button: verify form data is discarded and operation stops
- Save/Submit button: verify data is saved and flow proceeds
- Edge cases like clicking button with empty/invalid form`
      : "";

    const prompt = `You are a senior QA engineer. Generate 12-18 comprehensive test cases for a UI form module named "${module}".

Fields:
${desc}
${globalRules}
${buttonInstruction}

Cover: positive path, negative/validation, boundary values, mandatory field checks, edge cases, UI interactions, button conditional logic.

IMPORTANT: Respond ONLY with a raw JSON array. No markdown, no code fences, no explanation.

Format:
[{"id":"TC001","module":"${module}","scenario":"...","description":"...","steps":"Step 1: ...\\nStep 2: ...\\nStep 3: ...","testData":"...","expected":"...","actual":"","priority":"High","status":"Pending"}]

Priority must be exactly one of: High, Medium, Low
Status must be exactly: Pending`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_tokens: 5000,
          messages: [
            { role:"system", content:"You are a QA engineer. Always respond with raw JSON only. No markdown or code fences." },
            { role:"user",   content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      let raw = (data.choices?.[0]?.message?.content as string) || "[]";
      raw = raw.replace(/```json|```/gi, "").trim();
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) raw = raw.slice(start, end + 1);
      else throw new Error("Invalid JSON response from AI — no array found.");

      const parsed = JSON.parse(raw) as TestCase[];
      if (!Array.isArray(parsed) || parsed.length === 0)
        throw new Error("AI returned empty or invalid test cases.");

      setTestCases(parsed.map((tc, i) => ({
        ...tc,
        id: `TC${String(i + 1).padStart(3, "0")}`,
        rowId: i + 1,
        priority: (["High","Medium","Low"] as Priority[]).includes(tc.priority) ? tc.priority : "Medium",
        status: (["Pending","Pass","Fail","Blocked"] as Status[]).includes(tc.status) ? tc.status : "Pending",
      })));
      setFilterPriority("All");
      setFilterStatus("All");
    } catch (e) {
      setError("Error: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  const updateTC = (rowId: number, k: keyof TestCase, v: string): void =>
    setTestCases(p => p.map(tc => tc.rowId === rowId ? { ...tc, [k]: v } : tc));

  // ── Export XLSX ────────────────────────────────────────────────────────
  const exportXLSX = useCallback((): void => {
    const doExport = () => {
      const XLSX = (window as any).XLSX;
      const headers = ["Test Case ID","Module","Test Scenario","Test Case Description","Test Steps","Test Data","Expected Result","Actual Result","Priority","Status"];
      const rows = testCases.map(tc => [tc.id, tc.module, tc.scenario, tc.description, tc.steps, tc.testData, tc.expected, tc.actual, tc.priority, tc.status]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [{wch:12},{wch:16},{wch:26},{wch:32},{wch:38},{wch:22},{wch:32},{wch:22},{wch:10},{wch:10}];
      XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
      XLSX.writeFile(wb, `${module.replace(/\s+/g, "_")}_TestCases.xlsx`);
    };
    if ((window as any).XLSX) {
      doExport();
    } else if (!xlsxScriptLoaded.current) {
      xlsxScriptLoaded.current = true;
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = doExport;
      s.onerror = () => { xlsxScriptLoaded.current = false; setError("Failed to load XLSX library."); };
      document.head.appendChild(s);
    }
  }, [testCases, module]);

  // ── Derived state ──────────────────────────────────────────────────────
  const filteredCases = testCases.filter(tc => {
    if (filterPriority !== "All" && tc.priority !== filterPriority) return false;
    if (filterStatus !== "All" && tc.status !== filterStatus) return false;
    return true;
  });
  const passCount    = testCases.filter(t => t.status === "Pass").length;
  const failCount    = testCases.filter(t => t.status === "Fail").length;
  const pendingCount = testCases.filter(t => t.status === "Pending").length;
  const passRate     = testCases.length > 0 ? Math.round((passCount / testCases.length) * 100) : 0;

  // ── Inline styles helpers ──────────────────────────────────────────────
  const sectionTitle = (label: string) => (
    <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8,marginTop:14,display:"flex",alignItems:"center",gap:8}}>
      {label}
      <div style={{flex:1,height:1,background:C.border}}/>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'JetBrains Mono','Fira Code',monospace", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Exo+2:wght@400;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        #root { max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.surface}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${C.borderHover}}
        .fc{transition:all .18s ease}
        .fc:hover{border-color:${C.accentGlow}!important}
        .tc-row:hover td{background:${C.highlight}!important}
        .btn{font-family:inherit;cursor:pointer;border-radius:5px;font-size:11px;font-weight:700;letter-spacing:.8px;transition:all .18s;border:none;display:inline-flex;align-items:center;gap:4px}
        .btn-a{background:linear-gradient(135deg,${C.accent},#0090ff);color:#000;padding:8px 18px}
        .btn-a:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:0 4px 18px ${C.accentGlow}}
        .btn-a:disabled{opacity:.3;cursor:not-allowed;transform:none;filter:none;box-shadow:none}
        .btn-g{background:transparent;color:${C.textDim};border:1px solid ${C.border};padding:7px 14px}
        .btn-g:hover{border-color:${C.accent};color:${C.accent};background:${C.accentDim}}
        .btn-s{background:transparent;color:${C.green};border:1px solid #004030;padding:7px 16px}
        .btn-s:hover{background:${C.greenDim};border-color:#00a070}
        .btn-d{background:transparent;color:${C.red};border:1px solid #4a1525;padding:4px 9px;font-size:10px}
        .btn-d:hover{background:${C.redDim};border-color:#7a2040}
        .btn-p{background:transparent;color:${C.purple};border:1px solid #3a2060;padding:4px 9px;font-size:10px}
        .btn-p:hover{background:${C.purpleDim};border-color:#6a40a0}
        input,select,textarea{background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:5px 9px;border-radius:4px;font-family:inherit;font-size:11px;outline:none;transition:border .15s,box-shadow .15s}
        input:focus,select:focus,textarea:focus{border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentDim}}
        select option{background:${C.surface}}
        .tab{padding:7px 18px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;font-family:inherit;letter-spacing:.8px;transition:all .18s;display:inline-flex;align-items:center;gap:6px}
        .tab-on{background:${C.accent};color:#000;box-shadow:0 2px 12px ${C.accentGlow};border-color:transparent}
        .tab-off{background:transparent;color:${C.textDim};border-color:${C.border}}
        .tab-off:hover{color:${C.text};border-color:${C.borderHover};background:${C.card}}
        td input,td select,td textarea{width:100%;box-sizing:border-box;font-size:10px}
        .glow{text-shadow:0 0 24px ${C.accent}88}
        .ft-row{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;margin-bottom:5px;background:${C.card};border-radius:5px;border:1px solid ${C.border};transition:all .15s}
        .ft-row:hover{border-color:${C.borderHover};background:${C.cardHover}}
        .stat-card{background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;display:flex;flex-direction:column;gap:4px;min-width:90px}
        .chip{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${C.border};background:transparent;color:${C.textDim};font-family:inherit;transition:all .15s;letter-spacing:.5px}
        .chip:hover{border-color:${C.borderHover};color:${C.text}}
        .chip.on{border-color:${C.accent};color:${C.accent};background:${C.accentDim}}
        .cond-block{background:${C.bg};border:1px solid ${C.border};border-radius:6px;padding:10px 12px;margin-bottom:8px;animation:slideDown .15s ease}
        .cond-block:hover{border-color:${C.borderHover}}
        .cv-row{display:flex;align-items:center;gap:6px;margin-bottom:6px;animation:fadeUp .12s ease}
        .if-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#0a1830;color:${C.accent};border:1px solid #1a3060;white-space:nowrap}
        .then-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#001e14;color:${C.green};border:1px solid #004030;white-space:nowrap}
        .else-badge{padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:1px;background:#1e1200;color:${C.orange};border:1px solid #4a2a00;white-space:nowrap}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"11px 20px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:7,background:`linear-gradient(135deg,${C.accent},#0055cc)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#000",boxShadow:`0 2px 12px ${C.accentGlow}`}}>⚡</div>
          <div>
            <div className="glow" style={{fontFamily:"'Exo 2',sans-serif",fontSize:15,fontWeight:900,letterSpacing:2.5,color:C.accent,lineHeight:1.2}}>UI TEST FORGE</div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:3}}>GROQ · LLAMA 3.3-70B</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",flex:1,maxWidth:380}}>
          <span style={{fontSize:11,color:C.muted}}>🔑</span>
          <input
            type={showKey ? "text" : "password"}
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
            style={{flex:1,border:"none",background:"transparent",fontSize:11,padding:"2px 0",outline:"none",boxShadow:"none"}}
          />
          <button className="btn btn-g" style={{padding:"2px 8px",fontSize:9,border:"none"}} onClick={() => setShowKey(p => !p)}>
            {showKey ? "HIDE" : "SHOW"}
          </button>
        </div>
        <div style={{fontSize:9,color:C.muted,lineHeight:1.6,flexShrink:0}}>Free at <span style={{color:C.accent}}>console.groq.com</span></div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,flexShrink:0}}>
          <button className={`tab ${tab==="builder" ? "tab-on" : "tab-off"}`} onClick={() => setTab("builder")}>
            ⚙ BUILDER {fields.length > 0 && <span style={{background:tab==="builder"?"#00000033":C.accentDim,padding:"1px 6px",borderRadius:10,fontSize:9}}>{fields.length}</span>}
          </button>
          <button className={`tab ${tab==="testcases" ? "tab-on" : "tab-off"}`} onClick={() => setTab("testcases")}>
            📋 TEST CASES {testCases.length > 0 && <span style={{background:tab==="testcases"?"#00000033":C.accentDim,padding:"1px 6px",borderRadius:10,fontSize:9}}>{testCases.length}</span>}
          </button>
        </div>
      </div>

      {/* ── BUILDER TAB ── */}
      {tab==="builder" && (
        <div style={{display:"flex",height:"calc(100vh - 60px)",overflow:"hidden"}}>

          {/* Left — Field Type Palette */}
          <div style={{width:198,background:C.surface,borderRight:`1px solid ${C.border}`,padding:14,overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:0}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:10}}>FIELD TYPES</div>
            {FIELD_TYPES.map(ft => {
              const isBtn = ft.id === "button";
              return (
                <div key={ft.id} className="ft-row" style={isBtn ? {borderColor:"#3a2060",background:"#0f0a1c"} : {}}>
                  <span style={{fontSize:11,color:isBtn ? C.purple : C.text}}>
                    <span style={{marginRight:7,opacity:.8}}>{ft.icon}</span>{ft.label}
                  </span>
                  <button
                    className={`btn ${isBtn ? "btn-p" : "btn-a"}`}
                    style={{padding:"2px 9px",fontSize:12,minWidth:26,justifyContent:"center"}}
                    onClick={() => addField(ft.id)}
                    title={`Add ${ft.label}`}
                  >+</button>
                </div>
              );
            })}

            {/* Global Validation Rules */}
            <div style={{marginTop:16,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>GLOBAL VALIDATION RULES</div>
              <div style={{fontSize:9,color:C.muted,marginBottom:6,lineHeight:1.5,opacity:.8}}>
                Custom rules injected into AI prompt for test generation
              </div>
              <textarea
                value={globalValidations}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setGlobalValidations(e.target.value)}
                placeholder={"e.g.\nPassword must be 8+ chars\nEmail must be unique\nAll fields required on submit"}
                rows={6}
                style={{width:"100%",fontSize:10,resize:"vertical",lineHeight:1.6}}
              />
            </div>
          </div>

          {/* Canvas */}
          <div style={{flex:1,padding:"18px 20px",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 14px"}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,whiteSpace:"nowrap"}}>MODULE</span>
                <input
                  type="text"
                  value={module}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setModule(e.target.value)}
                  style={{border:"none",background:"transparent",outline:"none",boxShadow:"none",fontSize:12,fontWeight:600,width:200,color:C.text}}
                />
              </div>
              {fields.length > 0 && (
                <span style={{fontSize:10,color:C.muted}}>
                  {fields.length} field{fields.length!==1?"s":""} · {fields.filter(f=>f.mandatory).length} mandatory · {fields.filter(f=>f.type==="button").length} button{fields.filter(f=>f.type==="button").length!==1?"s":""}
                </span>
              )}
              <button
                className="btn btn-a"
                style={{marginLeft:"auto",padding:"9px 20px",fontSize:12}}
                onClick={generate}
                disabled={loading || !fields.length || !apiKey.trim()}
              >
                {loading ? <><Spinner/>Generating…</> : "⚡ Generate Test Cases"}
              </button>
            </div>

            {error && (
              <div style={{background:C.redDim,border:`1px solid #4a1525`,color:C.red,padding:"10px 14px",borderRadius:6,marginBottom:12,fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                ⚠ {error}
                <button onClick={() => setError("")} style={{marginLeft:"auto",background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>✕</button>
              </div>
            )}

            {!fields.length ? (
              <div style={{textAlign:"center",padding:"80px 40px",color:C.muted}}>
                <div style={{fontSize:52,marginBottom:16,opacity:.15}}>⊕</div>
                <div style={{fontSize:14,marginBottom:8,color:C.textDim}}>No fields added yet</div>
                <div style={{fontSize:11,opacity:.6}}>Click <strong style={{color:C.accent}}>+</strong> next to any field type on the left</div>
              </div>
            ) : (
              fields.map((field, i) => {
                const isBtn = field.type === "button";
                const borderColor = selected===field.id
                  ? isBtn ? `${C.purple}88` : `${C.accent}66`
                  : isBtn ? "#3a2060" : C.border;

                return (
                  <div
                    key={field.id}
                    className="fc"
                    onClick={() => setSelected(field.id===selected ? null : field.id)}
                    style={{
                      background: selected===field.id ? C.highlight : isBtn ? "#0c0a18" : C.card,
                      border: `1px solid ${borderColor}`,
                      borderRadius:7, padding:"12px 15px", marginBottom:7,
                      cursor:"pointer", animation:"fadeUp .18s ease",
                      boxShadow: selected===field.id ? `0 0 0 1px ${isBtn ? C.purpleDim : C.accentDim}, 0 4px 16px #00000044` : "none",
                    }}
                  >
                    {/* Field header row */}
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{color:isBtn?C.purple:C.accent,fontSize:11,fontWeight:700,fontFamily:"'Exo 2',sans-serif",opacity:.6,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
                      {isBtn
                        ? <ButtonPreview field={field}/>
                        : <span style={{fontSize:12,fontWeight:600,color:C.text}}>{field.label}</span>
                      }
                      <Badge color={isBtn ? {bg:C.purpleDim,text:C.purple,border:"#3a2060"} : undefined}>{field.type}</Badge>
                      {field.mandatory && <Badge color={{bg:"#001833",text:C.accent,border:"#003060"}}>required</Badge>}
                      {isBtn && field.buttonAction && (
                        <Badge color={{
                          bg: field.buttonAction==="cancel" ? C.redDim : field.buttonAction==="submit" ? C.greenDim : C.accentDim,
                          text: field.buttonAction==="cancel" ? C.red : field.buttonAction==="submit" ? C.green : C.accent,
                          border: field.buttonAction==="cancel" ? "#4a1525" : field.buttonAction==="submit" ? "#004030" : C.border,
                        }}>{field.buttonAction}</Badge>
                      )}
                      {isBtn && (field.conditions||[]).length > 0 && (
                        <Badge color={{bg:C.yellowDim,text:C.yellow,border:"#4a3800"}}>
                          {(field.conditions||[]).length} condition{(field.conditions||[]).length!==1?"s":""}
                        </Badge>
                      )}
                      <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}} onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                        {!isBtn && (
                          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.textDim,cursor:"pointer",userSelect:"none"}}>
                            <input
                              type="checkbox"
                              checked={field.mandatory}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(field.id, {mandatory:e.target.checked})}
                              style={{accentColor:C.accent}}
                            />
                            Mandatory
                          </label>
                        )}
                        <button className="btn btn-d" onClick={() => removeField(field.id)}>✕ Remove</button>
                      </div>
                      <span style={{fontSize:11,color:C.muted,transition:"transform .15s",transform:selected===field.id?"rotate(180deg)":"rotate(0deg)",display:"inline-block"}}>▾</span>
                    </div>

                    {/* Expanded config panel */}
                    {selected===field.id && (
                      <div style={{marginTop:12,paddingTop:12,borderTop:`1px dashed ${C.border}`}} onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>

                        {/* ── BUTTON CONFIG ── */}
                        {isBtn && (
                          <>
                            {sectionTitle("BUTTON SETTINGS")}
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                Label:
                                <input type="text" value={field.label} onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(field.id,{label:e.target.value})} style={{width:130}}/>
                              </label>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                Action:
                                <select value={field.buttonAction||"custom"} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                  const act = e.target.value as ButtonAction;
                                  updateField(field.id, {
                                    buttonAction: act,
                                    label: act==="submit" ? "Save" : act==="cancel" ? "Cancel" : field.label,
                                    buttonVariant: act==="cancel" ? "secondary" : act==="submit" ? "primary" : field.buttonVariant,
                                  });
                                }} style={{width:100}}>
                                  <option value="submit">Submit / Save</option>
                                  <option value="cancel">Cancel</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </label>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                Style:
                                <select value={field.buttonVariant||"primary"} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateField(field.id,{buttonVariant:e.target.value as any})} style={{width:110}}>
                                  <option value="primary">Primary (Blue)</option>
                                  <option value="secondary">Secondary (Grey)</option>
                                  <option value="danger">Danger (Red)</option>
                                </select>
                              </label>
                            </div>

                            {/* Auto-hint for cancel/save pair */}
                            {field.buttonAction === "cancel" && (
                              <div style={{fontSize:10,color:C.yellow,background:C.yellowDim,border:`1px solid #4a3800`,borderRadius:5,padding:"7px 10px",marginTop:8,lineHeight:1.6}}>
                                💡 <strong>Cancel button:</strong> Test cases will verify that clicking this button discards all form changes and stops the operation.
                              </div>
                            )}
                            {field.buttonAction === "submit" && (
                              <div style={{fontSize:10,color:C.green,background:C.greenDim,border:`1px solid #004030`,borderRadius:5,padding:"7px 10px",marginTop:8,lineHeight:1.6}}>
                                💡 <strong>Save/Submit button:</strong> Test cases will verify form validation runs, data is saved, and the flow proceeds to the next step.
                              </div>
                            )}

                            {/* Conditional logic */}
                            {sectionTitle("IF / ELSE CONDITIONAL LOGIC")}
                            <div style={{fontSize:9,color:C.muted,marginBottom:8,lineHeight:1.6}}>
                              Define what happens when this button is clicked under different conditions.
                            </div>

                            {(field.conditions || []).map((cond, ci) => (
                              <div key={cond.id} className="cond-block">
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                                  <span style={{fontSize:9,color:C.purple,letterSpacing:2,fontWeight:700}}>CONDITION {ci+1}</span>
                                  <button className="btn btn-d" style={{padding:"2px 7px"}} onClick={() => removeCondition(field.id, cond.id)}>✕</button>
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="if-badge" style={{marginTop:6}}>IF</span>
                                    <textarea
                                      value={cond.ifLabel}
                                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateCondition(field.id, cond.id, {ifLabel:e.target.value})}
                                      placeholder="Describe the condition (e.g. form is valid and all required fields are filled)"
                                      rows={2}
                                      style={{flex:1,fontSize:10,resize:"vertical"}}
                                    />
                                  </div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="then-badge" style={{marginTop:6}}>THEN</span>
                                    <textarea
                                      value={cond.thenAction}
                                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateCondition(field.id, cond.id, {thenAction:e.target.value})}
                                      placeholder="What happens? (e.g. Save the data and navigate to success page)"
                                      rows={2}
                                      style={{flex:1,fontSize:10,resize:"vertical"}}
                                    />
                                  </div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <span className="else-badge" style={{marginTop:6}}>ELSE</span>
                                    <textarea
                                      value={cond.elseAction}
                                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateCondition(field.id, cond.id, {elseAction:e.target.value})}
                                      placeholder="What happens otherwise? (e.g. Show error messages and keep form open)"
                                      rows={2}
                                      style={{flex:1,fontSize:10,resize:"vertical"}}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            <button className="btn btn-p" style={{fontSize:10,marginBottom:4}} onClick={() => addCondition(field.id)}>
                              + Add If/Else Condition
                            </button>
                          </>
                        )}

                        {/* ── REGULAR FIELD CONFIG ── */}
                        {!isBtn && (
                          <>
                            {sectionTitle("FIELD SETTINGS")}
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                              <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                Label:
                                <input type="text" value={field.label} onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(field.id,{label:e.target.value})} style={{width:170}}/>
                              </label>
                              {["text","password","email","textarea"].includes(field.type) && <>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                  Min Len: <input type="number" value={field.validation.minLength||""} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"minLength",e.target.value)} style={{width:55}}/>
                                </label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                  Max Len: <input type="number" value={field.validation.maxLength||""} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"maxLength",e.target.value)} style={{width:55}}/>
                                </label>
                              </>}
                              {field.type==="text" && (
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                  Regex: <input type="text" value={field.validation.regex||""} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"regex",e.target.value)} style={{width:140}} placeholder="[a-zA-Z0-9]*"/>
                                </label>
                              )}
                              {field.type==="number" && <>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                  Min: <input type="number" value={field.validation.min||""} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"min",e.target.value)} style={{width:60}}/>
                                </label>
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6}}>
                                  Max: <input type="number" value={field.validation.max||""} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"max",e.target.value)} style={{width:60}}/>
                                </label>
                              </>}
                              {field.type==="password" && (
                                <label style={{fontSize:10,color:C.textDim,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                  <input type="checkbox" checked={field.validation.specialChar||false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateVal(field.id,"specialChar",e.target.checked)} style={{accentColor:C.accent}}/>
                                  Require Special Char
                                </label>
                              )}
                            </div>

                            {["dropdown","checkbox","radio"].includes(field.type) && (
                              <div style={{marginTop:10}}>
                                <div style={{fontSize:9,color:C.muted,letterSpacing:3,marginBottom:8}}>OPTIONS</div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                                  {field.options.map((opt, idx) => (
                                    <div key={idx} style={{display:"flex",alignItems:"center",gap:4}}>
                                      <input type="text" value={opt} onChange={(e: ChangeEvent<HTMLInputElement>) => updateOpt(field.id,idx,e.target.value)} style={{width:110}}/>
                                      <button className="btn btn-d" style={{padding:"3px 7px"}} onClick={() => removeOpt(field.id,idx)}>✕</button>
                                    </div>
                                  ))}
                                  <button className="btn btn-g" style={{fontSize:10}} onClick={() => addOpt(field.id)}>+ Add Option</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── CUSTOM VALIDATION RULES (all field types) ── */}
                        {sectionTitle("CUSTOM VALIDATION RULES")}
                        <div style={{fontSize:9,color:C.muted,marginBottom:8,lineHeight:1.5}}>
                          Rules specific to this field — injected into AI prompt for targeted test generation.
                        </div>
                        {(field.customValidations || []).map((rule, idx) => (
                          <div key={idx} className="cv-row">
                            <span style={{fontSize:10,color:C.purple,fontWeight:700,minWidth:20,opacity:.7}}>#{idx+1}</span>
                            <input
                              type="text"
                              value={rule}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCustomValidation(field.id, idx, e.target.value)}
                              placeholder={
                                isBtn
                                  ? "e.g. Button should be disabled until all required fields are filled"
                                  : "e.g. Value must not contain special characters"
                              }
                              style={{flex:1,fontSize:10}}
                            />
                            <button className="btn btn-d" style={{padding:"3px 7px"}} onClick={() => removeCustomValidation(field.id, idx)}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-g" style={{fontSize:10,marginTop:2}} onClick={() => addCustomValidation(field.id)}>
                          + Add Validation Rule
                        </button>

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TEST CASES TAB ── */}
      {tab==="testcases" && (
        <div style={{padding:"14px 16px",height:"calc(100vh - 60px)",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:3}}>
              {testCases.length > 0
                ? `${filteredCases.length}/${testCases.length} TEST CASES — ${module.toUpperCase()}`
                : loading ? "GENERATING…" : "NO TEST CASES"}
            </span>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {loading && <span style={{fontSize:11,color:C.textDim,display:"flex",alignItems:"center"}}><Spinner/>AI generating…</span>}
              <button className="btn btn-g" onClick={() => setTab("builder")}>← Builder</button>
              {testCases.length > 0 && <button className="btn btn-s" onClick={exportXLSX}>⬇ Export XLSX</button>}
              {fields.length > 0 && (
                <button className="btn btn-a" onClick={generate} disabled={loading}>
                  {loading ? <><Spinner/>…</> : "⚡ Regenerate"}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{background:C.redDim,border:`1px solid #4a1525`,color:C.red,padding:"10px 14px",borderRadius:6,fontSize:11,display:"flex",alignItems:"center",gap:8}}>
              ⚠ {error}
              <button onClick={() => setError("")} style={{marginLeft:"auto",background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>✕</button>
            </div>
          )}

          {testCases.length > 0 && (
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
              <div className="stat-card" style={{flex:2,minWidth:200}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>PRIORITY</span>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(["All","High","Medium","Low"] as (Priority|"All")[]).map(p => (
                    <button key={p} className={`chip ${filterPriority===p?"on":""}`} onClick={() => setFilterPriority(p)}>
                      {p==="All" ? "All" : `${p} (${testCases.filter(t=>t.priority===p).length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="stat-card" style={{flex:3,minWidth:260}}>
                <span style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>STATUS</span>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {(["All","Pending","Pass","Fail","Blocked"] as (Status|"All")[]).map(s => (
                    <button key={s} className={`chip ${filterStatus===s?"on":""}`} onClick={() => setFilterStatus(s)}>
                      {s==="All" ? "All" : `${s} (${testCases.filter(t=>t.status===s).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!testCases.length && !loading ? (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.muted}}>
              <div style={{fontSize:52,marginBottom:16,opacity:.15}}>📋</div>
              <div style={{fontSize:14,marginBottom:8,color:C.textDim}}>No test cases yet</div>
              <div style={{fontSize:11,marginBottom:24,opacity:.6}}>Go to Builder → add fields → Generate</div>
              <button className="btn btn-a" onClick={() => setTab("builder")}>← Open Builder</button>
            </div>
          ) : (
            <div style={{flex:1,overflowX:"auto",overflowY:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}} ref={tableRef}>
                <thead>
                  <tr style={{background:C.card,position:"sticky",top:0,zIndex:2}}>
                    {["ID","Module","Scenario","Description","Test Steps","Test Data","Expected","Actual","Priority","Status"].map(h => (
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:700,letterSpacing:1,fontSize:9,whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,background:C.card}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && testCases.length === 0 ? (
                    Array.from({length:8}).map((_, i) => <SkeletonRow key={i} i={i}/>)
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>
                        No test cases match the current filter.{" "}
                        <button onClick={() => { setFilterPriority("All"); setFilterStatus("All"); }}
                          style={{background:"none",border:"none",color:C.accent,cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((tc, i) => (
                      <tr key={tc.rowId} className="tc-row" style={{animation:`fadeUp .12s ease ${i*.02}s both`}}>
                        {([
                          {key:"id",          w:70,  type:"id"},
                          {key:"module",      w:100, type:"text"},
                          {key:"scenario",    w:170, type:"text"},
                          {key:"description", w:190, type:"text"},
                          {key:"steps",       w:210, type:"multi"},
                          {key:"testData",    w:130, type:"text"},
                          {key:"expected",    w:190, type:"text"},
                          {key:"actual",      w:130, type:"text"},
                          {key:"priority",    w:90,  type:"select", opts:["High","Medium","Low"]},
                          {key:"status",      w:100, type:"select", opts:["Pending","Pass","Fail","Blocked"]},
                        ] as const).map(col => {
                          const { key, w, type } = col;
                          const opts = "opts" in col ? col.opts : [];
                          const val = tc[key as keyof TestCase] as string;
                          return (
                            <td key={key} style={{padding:"7px 10px",borderBottom:`1px solid ${C.border}22`,background:i%2===0?C.surface:C.bg,minWidth:w,maxWidth:w+60,verticalAlign:"top"}}>
                              {type==="id" ? (
                                <span style={{color:C.accent,fontWeight:700,fontSize:11,fontFamily:"'Exo 2',sans-serif"}}>{val}</span>
                              ) : type==="multi" ? (
                                <textarea value={val} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateTC(tc.rowId,key as keyof TestCase,e.target.value)} rows={3} style={{resize:"vertical",lineHeight:1.5}}/>
                              ) : type==="select" ? (
                                <div>
                                  <select value={val} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateTC(tc.rowId,key as keyof TestCase,e.target.value)} style={{marginBottom:5,width:"100%"}}>
                                    {(opts as readonly string[]).map(o => <option key={o}>{o}</option>)}
                                  </select>
                                  <Badge color={key==="priority" ? PRIORITY_C[tc.priority] : STATUS_C[tc.status]}>{val}</Badge>
                                </div>
                              ) : (
                                <input type="text" value={val} onChange={(e: ChangeEvent<HTMLInputElement>) => updateTC(tc.rowId,key as keyof TestCase,e.target.value)}/>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {testCases.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:4,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
              <span style={{fontSize:9,color:C.muted}}>All cells are editable · Update Actual Result &amp; Status after testing</span>
              {(filterPriority!=="All" || filterStatus!=="All") && (
                <button className="btn btn-g" style={{marginLeft:"auto",fontSize:9,padding:"3px 10px"}} onClick={() => { setFilterPriority("All"); setFilterStatus("All"); }}>
                  ✕ Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
