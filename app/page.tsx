'use client'

import { useMemo, useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type DayName = (typeof DAYS)[number];

const SESSION_COUNTS = {
  hall: 3,
  ks1: 4,
  ks2: 3,
};

const SLOT_START = 11 * 60 + 25;
const SLOT_END = 13 * 60 + 30;
const SLOT_STEP = 5;

type DayPlan = {
  hall: string[];
  ks1: string[];
  ks2: string[];
  earlyBreak: string[];
  lateBreak: string[];
  unassigned: string[];
  absent: string[];
  warning: string | null;
};

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateForDisplay(dateString: string) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addDays(dateString: string, daysToAdd: number) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildTimeRows() {
  const rows: { id: string; start: number; end: number; label: string }[] = [];

  for (let start = SLOT_START; start < SLOT_END; start += SLOT_STEP) {
    const end = start + SLOT_STEP;
    rows.push({
      id: `${start}-${end}`,
      start,
      end,
      label: `${formatTime(start)}–${formatTime(end)}`,
    });
  }

  return rows;
}

const TIME_ROWS = buildTimeRows();

function isActive(start: number, rowStart: number, rowEnd: number, end: number) {
  return rowStart >= start && rowEnd <= end;
}

function buildInitialAbsenceState(): Record<DayName, string[]> {
  return {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };
}

export default function Home() {
  const [staff, setStaff] = useState<string[]>([
    "Alice",
    "Ben",
    "Chloe",
    "Dan",
    "Ella",
    "Freddie",
    "Grace",
    "Harry",
    "Isla",
    "Jack",
    "Katie",
    "Leo",
    "Mia",
    "Noah",
  ]);
  const [input, setInput] = useState("");
  const [weekCommencing, setWeekCommencing] = useState("2026-03-23");
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [absentByDay, setAbsentByDay] = useState<Record<DayName, string[]>>(buildInitialAbsenceState());

  const addStaff = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (staff.includes(trimmed)) {
      setInput("");
      return;
    }
    setStaff([...staff, trimmed]);
    setInput("");
  };

  const removeStaff = (name: string) => {
    setStaff((prev) => prev.filter((s) => s !== name));
    setAbsentByDay((prev) => {
      const next = { ...prev };
      DAYS.forEach((day) => {
        next[day] = next[day].filter((s) => s !== name);
      });
      return next;
    });
  };

  const toggleAbsent = (day: DayName, name: string) => {
    setAbsentByDay((prev) => {
      const current = prev[day];
      const exists = current.includes(name);
      return {
        ...prev,
        [day]: exists ? current.filter((n) => n !== name) : [...current, name],
      };
    });
  };

  const weekSchedule = useMemo<Record<DayName, DayPlan>>(() => {
    const result = {} as Record<DayName, DayPlan>;

    DAYS.forEach((day, dayIndex) => {
      const absent = absentByDay[day] || [];
      const availableStaff = staff.filter((name) => !absent.includes(name));
      const totalStaff = availableStaff.length;

      if (totalStaff === 0) {
        result[day] = {
          hall: [],
          ks1: [],
          ks2: [],
          earlyBreak: [],
          lateBreak: [],
          unassigned: [],
          absent,
          warning: "No staff available for this day.",
        };
        return;
      }

      const rotationIndex = (dayIndex * 3) % totalStaff;
      const rotated = [
        ...availableStaff.slice(rotationIndex),
        ...availableStaff.slice(0, rotationIndex),
      ];

      const hall = rotated.slice(0, SESSION_COUNTS.hall);
      const ks1 = rotated.slice(
        SESSION_COUNTS.hall,
        SESSION_COUNTS.hall + SESSION_COUNTS.ks1
      );
      const ks2 = rotated.slice(
        SESSION_COUNTS.hall + SESSION_COUNTS.ks1,
        SESSION_COUNTS.hall + SESSION_COUNTS.ks1 + SESSION_COUNTS.ks2
      );
      const unassigned = rotated.slice(
        SESSION_COUNTS.hall + SESSION_COUNTS.ks1 + SESSION_COUNTS.ks2
      );

      const requiredCount = SESSION_COUNTS.hall + SESSION_COUNTS.ks1 + SESSION_COUNTS.ks2;
      const warning = availableStaff.length < requiredCount
        ? `Only ${availableStaff.length} staff available. ${requiredCount} needed for full cover.`
        : null;

      result[day] = {
        hall,
        ks1,
        ks2,
        earlyBreak: [...hall, ...ks1],
        lateBreak: [...ks2],
        unassigned,
        absent,
        warning,
      };
    });

    return result;
  }, [staff, absentByDay]);

  function cellNames(names: string[]) {
    if (!names.length) return <span className="emptyText">—</span>;

    return (
      <div className="nameList">
        {names.map((name) => (
          <div key={name} className="nameChip">
            {name}
          </div>
        ))}
      </div>
    );
  }

  function getCellContent(dayPlan: DayPlan, rowStart: number, rowEnd: number, column: string) {
    const hallActive = isActive(11 * 60 + 55, rowStart, rowEnd, 12 * 60 + 45);
    const ks1Active = isActive(12 * 60 + 10, rowStart, rowEnd, 13 * 60);
    const ks2Active = isActive(12 * 60 + 15, rowStart, rowEnd, 13 * 60);
    const earlyBreakActive = isActive(11 * 60 + 25, rowStart, rowEnd, 11 * 60 + 55);
    const lateBreakActive = isActive(13 * 60, rowStart, rowEnd, 13 * 60 + 30);

    if (column === "hall") return hallActive ? cellNames(dayPlan.hall) : <span className="emptyText">—</span>;
    if (column === "ks1") return ks1Active ? cellNames(dayPlan.ks1) : <span className="emptyText">—</span>;
    if (column === "ks2") return ks2Active ? cellNames(dayPlan.ks2) : <span className="emptyText">—</span>;
    if (column === "break") {
      if (earlyBreakActive) return cellNames(dayPlan.earlyBreak);
      if (lateBreakActive) return cellNames(dayPlan.lateBreak);
      return <span className="emptyText">—</span>;
    }
    return <span className="emptyText">—</span>;
  }

  const weekDisplay = formatDateForDisplay(weekCommencing);
  const dayPlan = weekSchedule[selectedDay];
  const selectedDayDate = addDays(weekCommencing, DAYS.indexOf(selectedDay));

  return (
    <div className="page">
      <div className="hero noPrint">
        <div>
          <h1>School Lunch & Playtime Rota</h1>
          <p>
            One timetable view for the week, with quick day switching and day-specific absences for sickness or part-time staff.
          </p>
        </div>
        <div className="summaryCard">
          <div className="summaryValue">{staff.length}</div>
          <div className="summaryLabel">Staff entered</div>
        </div>
      </div>

      <div className="toolbarCard noPrint">
        <div className="toolbarTop">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add staff member"
            className="staffInput"
            onKeyDown={(e) => {
              if (e.key === "Enter") addStaff();
            }}
          />

          <div className="dateBlock">
            <label htmlFor="weekCommencing">Week commencing</label>
            <input
              id="weekCommencing"
              type="date"
              value={weekCommencing}
              onChange={(e) => setWeekCommencing(e.target.value)}
              className="staffInput"
            />
          </div>

          <button onClick={addStaff} className="primaryButton">
            Add staff
          </button>

          <button onClick={() => window.print()} className="secondaryButton">
            Print / Save PDF
          </button>
        </div>

        <div className="dayTabs">
          {DAYS.map((day) => (
            <button
              key={day}
              className={`dayTab ${selectedDay === day ? "active" : ""}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="staffPills">
          {staff.map((name) => (
            <button
              key={name}
              className="staffPill"
              onClick={() => removeStaff(name)}
              title={`Remove ${name}`}
            >
              {name} <span>×</span>
            </button>
          ))}
        </div>

        <div className="legend">
          <div className="legendItem"><span className="legendSwatch hall" /> Hall</div>
          <div className="legendItem"><span className="legendSwatch ks1" /> KS1 Playground</div>
          <div className="legendItem"><span className="legendSwatch ks2" /> KS2 Playground</div>
          <div className="legendItem"><span className="legendSwatch break" /> Break</div>
          <div className="legendItem"><span className="legendSwatch absent" /> Absent for selected day</div>
        </div>
      </div>

      <section className="dayCard">
        <div className="dayHeader">
          <div>
            <h2>{selectedDay}</h2>
            <div className="printMeta">Week commencing: {weekDisplay}</div>
            <div className="printMeta">Date: {selectedDayDate}</div>
          </div>
          <div className="dayMeta">
            <span>Hall {dayPlan.hall.length}</span>
            <span>KS1 {dayPlan.ks1.length}</span>
            <span>KS2 {dayPlan.ks2.length}</span>
            <span>Absent {dayPlan.absent.length}</span>
          </div>
        </div>

        {dayPlan.warning ? <div className="warningBox">{dayPlan.warning}</div> : null}

        <div className="absenceCard noPrint">
          <div className="absenceHeader">
            <h3>Who is absent or unavailable on {selectedDay}?</h3>
            <p>Click a name to toggle them out for this day only. The timetable updates immediately.</p>
          </div>
          <div className="absencePills">
            {staff.map((name) => {
              const isAbsent = dayPlan.absent.includes(name);
              return (
                <button
                  key={name}
                  className={`absencePill ${isAbsent ? "absent" : "present"}`}
                  onClick={() => toggleAbsent(selectedDay, name)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tableWrap">
          <table className="rotaTable">
            <thead>
              <tr>
                <th className="timeCol">Time</th>
                <th>Hall</th>
                <th>KS1 Playground</th>
                <th>KS2 Playground</th>
                <th>Break</th>
              </tr>
            </thead>
            <tbody>
              {TIME_ROWS.map((row) => (
                <tr key={row.id}>
                  <td className="timeCell">{row.label}</td>
                  <td className="hallCell">{getCellContent(dayPlan, row.start, row.end, "hall")}</td>
                  <td className="ks1Cell">{getCellContent(dayPlan, row.start, row.end, "ks1")}</td>
                  <td className="ks2Cell">{getCellContent(dayPlan, row.start, row.end, "ks2")}</td>
                  <td className="breakCell">{getCellContent(dayPlan, row.start, row.end, "break")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="footerGrid">
          <div className="footerNote">
            <strong>Spare / unassigned staff:</strong> {dayPlan.unassigned.length ? dayPlan.unassigned.join(", ") : "None"}
          </div>
          <div className="footerNote">
            <strong>Absent staff:</strong> {dayPlan.absent.length ? dayPlan.absent.join(", ") : "None"}
          </div>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px;
          background: radial-gradient(circle at top left, #eef6ff 0%, #f8fafc 36%, #f5f3ff 100%);
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }
        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        h1 { margin: 0 0 8px; font-size: 32px; }
        p { margin: 0; color: #475569; max-width: 780px; }
        .summaryCard, .toolbarCard, .dayCard, .absenceCard {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          border-radius: 20px;
        }
        .summaryCard { min-width: 140px; padding: 18px 22px; text-align: center; }
        .summaryValue { font-size: 30px; font-weight: 700; line-height: 1; }
        .summaryLabel { margin-top: 8px; color: #64748b; font-size: 14px; }
        .toolbarCard { padding: 18px; margin-bottom: 24px; }
        .toolbarTop {
          display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; align-items: end;
        }
        .staffInput {
          flex: 1 1 240px; min-width: 220px; padding: 12px 14px; border-radius: 12px;
          border: 1px solid #cbd5e1; font-size: 15px; outline: none; background: white;
        }
        .staffInput:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14); }
        .dateBlock { display: flex; flex-direction: column; gap: 6px; min-width: 220px; }
        .dateBlock label { font-size: 14px; font-weight: 700; color: #334155; }
        .primaryButton, .secondaryButton, .dayTab {
          border-radius: 12px; padding: 12px 18px; font-weight: 700; cursor: pointer; white-space: nowrap;
        }
        .primaryButton { border: 0; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; }
        .secondaryButton { border: 1px solid #cbd5e1; background: white; color: #0f172a; }
        .dayTabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
        .dayTab { border: 1px solid #cbd5e1; background: white; color: #334155; }
        .dayTab.active { background: #0f172a; color: white; border-color: #0f172a; }
        .staffPills, .absencePills { display: flex; flex-wrap: wrap; gap: 8px; }
        .staffPills { margin-bottom: 14px; }
        .staffPill {
          border: 0; background: #e0e7ff; color: #312e81; border-radius: 999px; padding: 8px 12px; cursor: pointer; font-weight: 600;
        }
        .staffPill span { opacity: 0.7; }
        .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; color: #475569; }
        .legendItem { display: flex; align-items: center; gap: 8px; }
        .legendSwatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
        .legendSwatch.hall { background: #dbeafe; }
        .legendSwatch.ks1 { background: #ccfbf1; }
        .legendSwatch.ks2 { background: #fef3c7; }
        .legendSwatch.break { background: #ede9fe; }
        .legendSwatch.absent { background: #fee2e2; }
        .dayCard { padding: 18px; page-break-after: always; break-after: page; }
        .dayHeader {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .dayHeader h2 { margin: 0; font-size: 22px; }
        .printMeta { color: #64748b; font-size: 14px; margin-top: 4px; }
        .dayMeta { display: flex; gap: 8px; flex-wrap: wrap; }
        .dayMeta span {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; font-size: 13px; color: #334155;
        }
        .warningBox {
          margin-bottom: 14px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: 14px; padding: 12px 14px; font-weight: 600;
        }
        .absenceCard { padding: 16px; margin-bottom: 16px; background: rgba(248, 250, 252, 0.95); }
        .absenceHeader { margin-bottom: 12px; }
        .absenceHeader h3 { margin: 0 0 6px; font-size: 16px; }
        .absenceHeader p { font-size: 14px; color: #64748b; }
        .absencePill {
          border-radius: 999px; padding: 8px 12px; cursor: pointer; font-weight: 700; border: 1px solid transparent;
        }
        .absencePill.present { background: #ecfeff; color: #155e75; border-color: #a5f3fc; }
        .absencePill.absent { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .tableWrap { overflow-x: auto; }
        .rotaTable {
          width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; font-size: 14px;
        }
        .rotaTable th {
          text-align: left; padding: 12px; background: #0f172a; color: white; font-weight: 700;
          border-right: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0;
        }
        .rotaTable th:first-child { border-top-left-radius: 14px; }
        .rotaTable th:last-child { border-top-right-radius: 14px; border-right: 0; }
        .rotaTable td {
          vertical-align: top; padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
        }
        .rotaTable tbody tr td:first-child { border-left: 1px solid #e2e8f0; }
        .timeCol { width: 110px; }
        .timeCell { background: #f8fafc; font-weight: 700; color: #334155; white-space: nowrap; font-size: 12px; }
        .hallCell { background: #eff6ff; }
        .ks1Cell { background: #f0fdfa; }
        .ks2Cell { background: #fffbeb; }
        .breakCell { background: #f5f3ff; }
        .nameList { display: flex; flex-direction: column; gap: 4px; }
        .nameChip {
          background: rgba(255,255,255,0.9); border: 1px solid rgba(148,163,184,0.2); border-radius: 10px;
          padding: 5px 7px; font-weight: 600; color: #1e293b; font-size: 12px;
        }
        .emptyText { color: #94a3b8; }
        .footerGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
        .footerNote { font-size: 14px; color: #475569; }
        @media (max-width: 900px) {
          .footerGrid { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .page { padding: 14px; }
          h1 { font-size: 26px; }
        }
        @media print {
          .noPrint { display: none !important; }
          .page { background: white !important; padding: 0 !important; }
          .dayCard {
            box-shadow: none !important; border: none !important; background: white !important;
            margin: 0 0 20px 0; padding: 0 !important;
          }
          .tableWrap { overflow: visible !important; }
          .rotaTable { min-width: 100% !important; font-size: 11px; }
          .rotaTable th { background: #e2e8f0 !important; color: #0f172a !important; position: static !important; }
          .nameChip { border: 1px solid #cbd5e1 !important; background: white !important; font-size: 10px; padding: 4px 6px; }
          .timeCell { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
