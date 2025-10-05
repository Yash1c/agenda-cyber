import dayjs from "dayjs"; import isoWeek from "dayjs/plugin/isoWeek"; import utc from "dayjs/plugin/utc";
let agendaRust = null;
let wasmReady = false;
import { schedule } from "./data.js";

(async () => {
  try {
    dayjs.extend(isoWeek);
    dayjs.extend(utc);
    
    // 🔥 CARREGA RUST
    const { default: init, AgendaProcessor } = await import("./agenda_rust.js");
    await init();
    agendaRust = new AgendaProcessor();
    
    // Carrega dados no Rust
    await agendaRust.carregar_eventos(schedule);
    wasmReady = true;
    console.log("✅ Rust carregado e processando agenda!");
  } catch(e) {
    console.warn("WASM não carregado, usando JS:", e);
    wasmReady = false;
  }
  render();
})();
const el = id => document.getElementById(id);
["search","groupFilter","weekStart","exportIcs"].forEach(id => el(id)?.addEventListener(id==="exportIcs"?"click":"input", handle));
function handle(e){ if(e.type==="click") return exportIcs(); render(); }
function render() {
  const q = el("search").value.toLowerCase();
  const g = el("groupFilter").value;
  
  // 🔥 AGORA usando Rust para filtragem!
  let filtered;
  if (wasmReady && agendaRust) {
    try {
      const rustResult = agendaRust.filtrar_eventos(g || null, q || null);
      filtered = rustResult || schedule; // Fallback se der erro
    } catch (e) {
      console.warn("Erro no Rust, usando JS:", e);
      filtered = schedule.filter(ev => 
        (!g || ev.group === g) && 
        (!q || `${ev.title} ${ev.prof}`.toLowerCase().includes(q))
      );
    }
  } else {
    // Fallback para JS
    filtered = schedule.filter(ev => 
      (!g || ev.group === g) && 
      (!q || `${ev.title} ${ev.prof}`.toLowerCase().includes(q))
    );
  }
  
  // Resto do teu código original...
  const weekStart = dayjs(el("weekStart").value || dayjs().isoWeekday(1)).startOf("day");
  const days = ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
  
  const grid = ['<div class="grid">'];
  grid.push(`<div></div>${days.map(d=>`<div class="col-head">${d}</div>`).join("")}`);
  
  const hours = ["08:00","10:00","13:00","15:00","17:00"];
  for(const h of hours){ 
    grid.push(`<div class="time-col col-head">${h}</div>`); 
    for(let i=0;i<7;i++){ 
      const day = i+1;
      const evs = filtered.filter(ev => ev.day===day && ev.start===h);
      grid.push(`<div class="slot">${evs.map(ev => (
        `<div class="ev ev-${ev.group}">
          <div class="ev-title">${ev.title} — ${ev.group}</div>
          <div class="ev-meta">${ev.prof} · ${ev.room} · ${ev.start}–${ev.end}</div>
        </div>`
      )).join("")}</div>`);
    }
  }
  grid.push("</div>");
  
  el("app").innerHTML = `<p class="note">Filtre por grupo, busque por professor ou matéria, selecione o início da semana e exporte para calendário. ${wasmReady ? '🚀 Powered by Rust' : '⚡ JavaScript'}</p>${grid.join("")}`;
}
function exportIcs() {
  const q = el("search").value.toLowerCase();
  const g = el("groupFilter").value;
  
  if (wasmReady && agendaRust) {
    try {
      // 🚀 Geração ICS SUPER rápida em Rust
      const weekStart = el("weekStart").value || dayjs().isoWeekday(1).format("YYYY-MM-DD");
      const icsContent = agendaRust.gerar_ics(weekStart);
      
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const a = document.createElement("a"); 
      a.href = URL.createObjectURL(blob); 
      a.download = "agenda_rust.ics"; 
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    } catch (e) {
      console.warn("Erro no Rust ICS, usando JS:", e);
    }
  }
  
  // Fallback para teu código JS original
  const weekStart = dayjs(el("weekStart").value || dayjs().isoWeekday(1)).startOf("day");
  const filtered = schedule.filter(ev => (!g||ev.group===g) && (!q||`${ev.title} ${ev.prof}`.toLowerCase().includes(q)));
  
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Agenda Turma//PT-BR//"];
  for(const ev of filtered){
    const start = weekStart.add(ev.day-1,"day").hour(+ev.start.split(":")[0]).minute(+ev.start.split(":")[1]);
    const end = weekStart.add(ev.day-1,"day").hour(+ev.end.split(":")[0]).minute(+ev.end.split(":")[1]);
    lines.push("BEGIN:VEVENT");
    lines.push(`SUMMARY:${ev.title} — ${ev.group}`);
    lines.push(`DTSTART:${start.utc().format("YYYYMMDDTHHmmss[Z]")}`);
    lines.push(`DTEND:${end.utc().format("YYYYMMDDTHHmmss[Z]")}`);
    lines.push(`LOCATION:${ev.room}`);
    lines.push(`DESCRIPTION:Professor ${ev.prof}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a"); 
  a.href = URL.createObjectURL(blob); 
  a.download = "agenda.ics"; 
  a.click(); 
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}