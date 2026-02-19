// Calendar Dashboard — Vision CRM
// Server Component | French UI | Hardcoded demo data

const DAYS = [
  { short: "Lun", num: 17, label: "Lun 17" },
  { short: "Mar", num: 18, label: "Mar 18" },
  { short: "Mer", num: 19, label: "Mer 19" },
  { short: "Jeu", num: 20, label: "Jeu 20" },
  { short: "Ven", num: 21, label: "Ven 21" },
  { short: "Sam", num: 22, label: "Sam 22" },
  { short: "Dim", num: 23, label: "Dim 23" },
];

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 – 18:00

const TODAY_INDEX = 3; // Jeu 20 Février 2026

interface CalendarEvent {
  day: number;        // 0‑6 (Lun=0 … Dim=6)
  startHour: number;  // 8–17
  duration: number;   // in hours (supports halves)
  title: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const EVENTS: CalendarEvent[] = [
  {
    day: 0, startHour: 9, duration: 1,
    title: "RDV Client - M. Dupont",
    bgClass: "bg-brand-100", borderClass: "border-brand-500", textClass: "text-brand-700",
  },
  {
    day: 0, startHour: 14, duration: 1,
    title: "Appel commercial SCI",
    bgClass: "bg-violet-100", borderClass: "border-violet-500", textClass: "text-violet-700",
  },
  {
    day: 1, startHour: 10, duration: 1.5,
    title: "Demo Vision CRM",
    bgClass: "bg-emerald-100", borderClass: "border-emerald-500", textClass: "text-emerald-700",
  },
  {
    day: 2, startHour: 9, duration: 0.5,
    title: "Reunion equipe",
    bgClass: "bg-amber-100", borderClass: "border-amber-500", textClass: "text-amber-700",
  },
  {
    day: 2, startHour: 14, duration: 2,
    title: "Visite chantier Jardin Fleuri",
    bgClass: "bg-emerald-100", borderClass: "border-emerald-500", textClass: "text-emerald-700",
  },
  {
    day: 3, startHour: 9, duration: 3,
    title: "Formation nouveau commercial",
    bgClass: "bg-rose-100", borderClass: "border-rose-500", textClass: "text-rose-700",
  },
  {
    day: 4, startHour: 11, duration: 1,
    title: "Point hebdo direction",
    bgClass: "bg-brand-100", borderClass: "border-brand-500", textClass: "text-brand-700",
  },
  {
    day: 4, startHour: 17, duration: 1,
    title: "Depart week-end",
    bgClass: "bg-surface-100", borderClass: "border-surface-400", textClass: "text-surface-700",
  },
];

/* Upcoming events for the sidebar (sorted chronologically) */
const UPCOMING = [
  { time: "Jeu 20, 09:00", title: "Formation nouveau commercial", dotColor: "bg-rose-500" },
  { time: "Ven 21, 11:00", title: "Point hebdo direction", dotColor: "bg-brand-500" },
  { time: "Ven 21, 17:00", title: "Depart week-end", dotColor: "bg-surface-400" },
  { time: "Lun 24, 09:00", title: "Revue pipeline commercial", dotColor: "bg-violet-500" },
];

/* ---------- helpers ---------- */

/** CSS grid row start / span for an event (each hour = 2 sub‑rows of 30 min) */
function gridRow(startHour: number, duration: number) {
  const rowStart = (startHour - 8) * 2 + 1;          // 1-based
  const rowSpan = Math.round(duration * 2);
  return `${rowStart} / span ${rowSpan}`;
}

function formatHour(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}

/* ---------- page ---------- */

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Calendrier</h1>
          <p className="text-sm text-surface-500 mt-1">
            Gerez vos rendez-vous et evenements
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nouveau rendez-vous
        </button>
      </div>

      {/* ---- Week navigation ---- */}
      <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors">
            Aujourd&apos;hui
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <h2 className="text-sm font-semibold text-surface-800">
          17 &ndash; 23 Fevrier 2026
        </h2>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-surface-400 sm:inline">Vue :</span>
          <button className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600">
            Semaine
          </button>
          <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-surface-500 hover:bg-surface-50 transition-colors">
            Mois
          </button>
        </div>
      </div>

      {/* ---- Main layout: calendar + sidebar ---- */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* ---- Weekly calendar grid ---- */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-surface-200 bg-white">
          {/* Day headers */}
          <div
            className="grid border-b border-surface-200"
            style={{ gridTemplateColumns: "64px repeat(7, minmax(110px, 1fr))" }}
          >
            {/* Empty corner cell */}
            <div className="border-r border-surface-100 p-2" />
            {DAYS.map((day, i) => (
              <div
                key={day.label}
                className={`border-r border-surface-100 px-2 py-3 text-center last:border-r-0 ${
                  i === TODAY_INDEX ? "bg-brand-50" : ""
                }`}
              >
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">
                  {day.short}
                </span>
                <span
                  className={`mt-0.5 flex items-center justify-center text-sm font-bold ${
                    i === TODAY_INDEX
                      ? "mx-auto h-7 w-7 rounded-full bg-brand-500 text-white"
                      : "text-surface-800"
                  }`}
                >
                  {day.num}
                </span>
              </div>
            ))}
          </div>

          {/* Time grid body */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: "64px repeat(7, minmax(110px, 1fr))",
              gridTemplateRows: `repeat(${HOURS.length * 2}, 30px)`, // 2 sub-rows per hour (30 min each)
            }}
          >
            {/* ---- Hour labels + horizontal lines ---- */}
            {HOURS.map((hour, hIdx) => (
              <div
                key={`label-${hour}`}
                className="relative border-r border-surface-100 pr-2 text-right"
                style={{
                  gridColumn: "1",
                  gridRow: `${hIdx * 2 + 1} / span 2`,
                }}
              >
                <span className="relative -top-2 text-xs text-surface-400">
                  {formatHour(hour)}
                </span>
              </div>
            ))}

            {/* ---- Day column backgrounds + horizontal gridlines ---- */}
            {DAYS.map((day, dIdx) => (
              <div
                key={`col-bg-${dIdx}`}
                className={`border-r border-surface-100 last:border-r-0 ${
                  dIdx === TODAY_INDEX ? "bg-brand-50/40" : ""
                }`}
                style={{
                  gridColumn: `${dIdx + 2}`,
                  gridRow: `1 / -1`,
                }}
              />
            ))}

            {/* ---- Horizontal hour lines ---- */}
            {HOURS.map((_, hIdx) => (
              <div
                key={`line-${hIdx}`}
                className="pointer-events-none border-t border-surface-100"
                style={{
                  gridColumn: "2 / -1",
                  gridRow: `${hIdx * 2 + 1}`,
                }}
              />
            ))}

            {/* ---- Events ---- */}
            {EVENTS.map((evt) => (
              <div
                key={`${evt.day}-${evt.startHour}-${evt.title}`}
                className={`relative z-10 mx-1 my-0.5 overflow-hidden rounded-md border-l-4 px-2 py-1 ${evt.bgClass} ${evt.borderClass} ${evt.textClass}`}
                style={{
                  gridColumn: `${evt.day + 2}`,
                  gridRow: gridRow(evt.startHour, evt.duration),
                }}
              >
                <p className="truncate text-xs font-semibold leading-tight">
                  {evt.title}
                </p>
                <p className="text-[10px] opacity-75">
                  {formatHour(evt.startHour)} &ndash;{" "}
                  {formatHour(evt.startHour + evt.duration)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Right sidebar ---- */}
        <div className="w-full xl:w-72 flex-shrink-0 space-y-4">
          {/* Upcoming events card */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-4">
              Prochains rendez-vous
            </h3>
            <ul className="space-y-4">
              {UPCOMING.map((item) => (
                <li key={item.title + item.time} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${item.dotColor}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-surface-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-surface-400">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats card */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-4">
              Cette semaine
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Total RDV</span>
                <span className="text-sm font-bold text-surface-800">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Clients</span>
                <span className="text-sm font-bold text-emerald-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Internes</span>
                <span className="text-sm font-bold text-amber-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Formations</span>
                <span className="text-sm font-bold text-rose-600">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Autres</span>
                <span className="text-sm font-bold text-surface-600">1</span>
              </div>
            </div>
          </div>

          {/* Mini legend */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-surface-800 mb-3">
              Legende
            </h3>
            <div className="space-y-2">
              {[
                { color: "bg-brand-500", label: "Client / Commercial" },
                { color: "bg-emerald-500", label: "Visite / Demo" },
                { color: "bg-violet-500", label: "Appel" },
                { color: "bg-amber-500", label: "Reunion interne" },
                { color: "bg-rose-500", label: "Formation" },
                { color: "bg-surface-400", label: "Personnel" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-surface-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
