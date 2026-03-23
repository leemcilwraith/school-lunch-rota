'use client'

import { useMemo, useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SESSION_COUNTS = {
  hall: 3,
  ks1: 4,
  ks2: 3,
};

const TIME_ROWS = [
  { id: "early-break", label: "11:25–11:55" },
  { id: "hall-only", label: "11:55–12:10" },
  { id: "hall-ks1", label: "12:10–12:15" },
  { id: "full-overlap", label: "12:15–12:45" },
  { id: "ks1-ks2", label: "12:45–13:00" },
  { id: "late-break", label: "13:00–13:30" },
];

type DayPlan = {
  hall: string[];
  ks1: string[];
  ks2: string[];
  earlyBreak: string[];
  lateBreak: string[];
  unassigned: string[];
};

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
    setStaff(staff.filter((s) => s !== name));
  };

  const weekSchedule = useMemo<Record<string, DayPlan>>(() => {
    const result: Record<string, DayPlan> = {};
    const totalStaff = staff.length || 1;

    DAYS.forEach((day, dayIndex) => {
      const rotationIndex = (dayIndex * 3) % totalStaff;
      const rotated = [
        ...staff.slice(rotationIndex),
        ...staff.slice(0, rotationIndex),
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

      result[day] = {
        hall,
        ks1,
        ks2,
        earlyBreak: [...hall, ...ks1],
        lateBreak: [...ks2],
        unassigned,
      };
    });

    return result;
  }, [staff]);

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

  function getCellContent(dayPlan: DayPlan, rowId: string, column: string) {
    switch (`${rowId}-${column}`) {
      case "early-break-break":
        return cellNames(dayPlan.earlyBreak);
      case "hall-only-hall":
        return cellNames(dayPlan.hall);
      case "hall-ks1-hall":
        return cellNames(dayPlan.hall);
      case "hall-ks1-ks1":
        return cellNames(dayPlan.ks1);
      case "full-overlap-hall":
        return cellNames(dayPlan.hall);
      case "full-overlap-ks1":
        return cellNames(dayPlan.ks1);
      case "full-overlap-ks2":
        return cellNames(dayPlan.ks2);
      case "ks1-ks2-ks1":
        return cellNames(dayPlan.ks1);
      case "ks1-ks2-ks2":
        return cellNames(dayPlan.ks2);
      case "ks1-ks2-break":
        return cellNames(dayPlan.hall);
      case "late-break-break":
        return cellNames(dayPlan.lateBreak);
      default:
        return <span className="emptyText">—</span>;
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h1>School Lunch & Playtime Rota</h1>
          <p>
            Weekly timetable view with locations across the top, times down the
            side, and breaks clearly shown.
          </p>
        </div>
        <div className="summaryCard">
          <div className="summaryValue">{staff.length}</div>
          <div className="summaryLabel">Staff entered</div>
        </div>
      </div>

      <div className="toolbarCard">
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
          <button onClick={addStaff} className="primaryButton">
            Add staff
          </button>
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
          <div className="legendItem">
            <span className="legendSwatch hall" />
            Hall
          </div>
          <div className="legendItem">
            <span className="legendSwatch ks1" />
            KS1 Playground
          </div>
          <div className="legendItem">
            <span className="legendSwatch ks2" />
            KS2 Playground
          </div>
          <div className="legendItem">
            <span className="legendSwatch break" />
            Break
          </div>
        </div>
      </div>

      <div className="daysGrid">
        {DAYS.map((day) => {
          const dayPlan = weekSchedule[day];

          return (
            <section key={day} className="dayCard">
              <div className="dayHeader">
                <h2>{day}</h2>
                <div className="dayMeta">
                  <span>Hall {dayPlan.hall.length}</span>
                  <span>KS1 {dayPlan.ks1.length}</span>
                  <span>KS2 {dayPlan.ks2.length}</span>
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
                        <td className="hallCell">
                          {getCellContent(dayPlan, row.id, "hall")}
                        </td>
                        <td className="ks1Cell">
                          {getCellContent(dayPlan, row.id, "ks1")}
                        </td>
                        <td className="ks2Cell">
                          {getCellContent(dayPlan, row.id, "ks2")}
                        </td>
                        <td className="breakCell">
                          {getCellContent(dayPlan, row.id, "break")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="footerNote">
                <strong>Unassigned / spare staff:</strong>{" "}
                {dayPlan.unassigned.length ? dayPlan.unassigned.join(", ") : "None"}
              </div>
            </section>
          );
        })}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top left, #f0f9ff 0%, #f8fafc 35%, #eef2ff 100%);
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

        h1 {
          margin: 0 0 8px;
          font-size: 32px;
        }

        p {
          margin: 0;
          color: #475569;
          max-width: 780px;
        }

        .summaryCard,
        .toolbarCard,
        .dayCard {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          border-radius: 20px;
        }

        .summaryCard {
          min-width: 140px;
          padding: 18px 22px;
          text-align: center;
        }

        .summaryValue {
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
        }

        .summaryLabel {
          margin-top: 8px;
          color: #64748b;
          font-size: 14px;
        }

        .toolbarCard {
          padding: 18px;
          margin-bottom: 24px;
        }

        .toolbarTop {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .staffInput {
          flex: 1 1 260px;
          min-width: 220px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 15px;
          outline: none;
        }

        .staffInput:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
        }

        .primaryButton {
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .primaryButton:hover {
          opacity: 0.96;
        }

        .staffPills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }

        .staffPill {
          border: 0;
          background: #e0e7ff;
          color: #312e81;
          border-radius: 999px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .staffPill span {
          opacity: 0.7;
        }

        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          font-size: 14px;
          color: #475569;
        }

        .legendItem {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legendSwatch {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          display: inline-block;
        }

        .legendSwatch.hall {
          background: #dbeafe;
        }

        .legendSwatch.ks1 {
          background: #ccfbf1;
        }

        .legendSwatch.ks2 {
          background: #fef3c7;
        }

        .legendSwatch.break {
          background: #ede9fe;
        }

        .daysGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(560px, 1fr));
          gap: 20px;
        }

        .dayCard {
          padding: 18px;
        }

        .dayHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .dayHeader h2 {
          margin: 0;
          font-size: 22px;
        }

        .dayMeta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dayMeta span {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 13px;
          color: #334155;
        }

        .tableWrap {
          overflow-x: auto;
        }

        .rotaTable {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 760px;
          font-size: 14px;
        }

        .rotaTable th {
          text-align: left;
          padding: 12px;
          background: #0f172a;
          color: white;
          font-weight: 700;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .rotaTable th:first-child {
          border-top-left-radius: 14px;
        }

        .rotaTable th:last-child {
          border-top-right-radius: 14px;
          border-right: 0;
        }

        .rotaTable td {
          vertical-align: top;
          padding: 10px;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .rotaTable tbody tr td:first-child {
          border-left: 1px solid #e2e8f0;
        }

        .timeCol {
          width: 110px;
        }

        .timeCell {
          background: #f8fafc;
          font-weight: 700;
          color: #334155;
          white-space: nowrap;
        }

        .hallCell {
          background: #eff6ff;
        }

        .ks1Cell {
          background: #f0fdfa;
        }

        .ks2Cell {
          background: #fffbeb;
        }

        .breakCell {
          background: #f5f3ff;
        }

        .nameList {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nameChip {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          padding: 6px 8px;
          font-weight: 600;
          color: #1e293b;
        }

        .emptyText {
          color: #94a3b8;
        }

        .footerNote {
          margin-top: 14px;
          font-size: 14px;
          color: #475569;
        }

        @media (max-width: 700px) {
          .page {
            padding: 14px;
          }

          .daysGrid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}
