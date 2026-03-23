'use client'

import { useMemo, useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type DayName = (typeof DAYS)[number];
type DutyColumnKey = "hall" | "ks1" | "ks2";
type ColumnKey = DutyColumnKey | "break";

type BreakRule = "within-window" | "extend-30" | "fully-flexible";

type StaffMember = {
  name: string;
  availableStart?: number;
  availableEnd?: number;
  breakRule?: BreakRule;
};

type BreakWindow = { start: number; end: number } | null;

type BreakAssignment = {
  lunch: string[];
  spare: string[];
};

type SlotAssignment = {
  hall: string[];
  ks1: string[];
  ks2: string[];
  break: BreakAssignment;
};

type DayPlan = {
  rows: SlotAssignment[];
  absent: string[];
  warning: string | null;
  lunchBreaks: Record<string, BreakWindow>;
};

type SegmentCell = {
  rowSpan: number;
} | null;

const SLOT_START = 11 * 60 + 25;
const SLOT_END = 13 * 60 + 30;
const SLOT_STEP = 5;
const LUNCH_BREAK_SLOTS = 6; // 30 minutes

const DEFAULT_STAFF: StaffMember[] = [
  { name: "Paul", availableStart: 11 * 60 + 55, availableEnd: 12 * 60 + 45, breakRule: "extend-30" },
  { name: "Niki", availableStart: 11 * 60 + 55, availableEnd: 12 * 60 + 45, breakRule: "extend-30" },
  { name: "Sharon", availableStart: 12 * 60, availableEnd: 12 * 60 + 45, breakRule: "extend-30" },
  { name: "Bryan", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "extend-30" },
  { name: "Drissia", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "extend-30" },
  { name: "Rhea", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "extend-30" },
  { name: "Jamie", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "extend-30" },
  { name: "Hayley", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "extend-30" },
  { name: "Holly", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "within-window" },
  { name: "Amy", availableStart: 12 * 60 + 15, availableEnd: 13 * 60, breakRule: "within-window" },
  { name: "Caroline", availableStart: 12 * 60, availableEnd: 12 * 60 + 45, breakRule: "extend-30" },
  { name: "Naomi", availableStart: 12 * 60, availableEnd: 12 * 60 + 45, breakRule: "extend-30" },
  { name: "Hannah", breakRule: "fully-flexible" },
  { name: "Nick", breakRule: "fully-flexible" },
];

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

function buildInitialAbsenceState(): Record<DayName, string[]> {
  return {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };
}

function availabilityLabel(member: StaffMember) {
  const timeLabel =
    member.availableStart === undefined || member.availableEnd === undefined
      ? "Available all lunch"
      : `${formatTime(member.availableStart)}–${formatTime(member.availableEnd)}`;

  const rule = member.breakRule ?? "within-window";

  const ruleLabel =
    rule === "extend-30"
      ? " | break ±30 mins"
      : rule === "fully-flexible"
      ? " | break anytime"
      : " | break in window";

  return `${timeLabel}${ruleLabel}`;
}

function isStaffAvailableForSlot(member: StaffMember, rowStart: number, rowEnd: number) {
  const startOk = member.availableStart === undefined || member.availableStart <= rowStart;
  const endOk = member.availableEnd === undefined || member.availableEnd >= rowEnd;
  return startOk && endOk;
}

function requiredCount(column: DutyColumnKey, rowStart: number, rowEnd: number) {
  const slotId = `${rowStart}-${rowEnd}`;
  if (column === "hall") {
    if (slotId === `${11 * 60 + 55}-${12 * 60}`) return 2;
    if (rowStart >= 12 * 60 && rowEnd <= 12 * 60 + 45) return 3;
    return 0;
  }
  if (column === "ks1") {
    return rowStart >= 12 * 60 + 10 && rowEnd <= 13 * 60 ? 4 : 0;
  }
  return rowStart >= 12 * 60 + 15 && rowEnd <= 13 * 60 ? 3 : 0;
}

function dutyNeedForRow(rowStart: number, rowEnd: number) {
  return (
    requiredCount("hall", rowStart, rowEnd) +
    requiredCount("ks1", rowStart, rowEnd) +
    requiredCount("ks2", rowStart, rowEnd)
  );
}

function breakSignature(breakInfo: BreakAssignment) {
  return `L:${breakInfo.lunch.join("|")}__S:${breakInfo.spare.join("|")}`;
}

function getBreakWindow(member: StaffMember) {
  const rule = member.breakRule ?? "within-window";

  if (rule === "fully-flexible") {
    return { start: SLOT_START, end: SLOT_END };
  }

  const baseStart = member.availableStart ?? SLOT_START;
  const baseEnd = member.availableEnd ?? SLOT_END;

  if (rule === "extend-30") {
    return {
      start: Math.max(SLOT_START, baseStart - 30),
      end: Math.min(SLOT_END, baseEnd + 30),
    };
  }

  return {
    start: baseStart,
    end: baseEnd,
  };
}

function isStaffEligibleForBreakSlot(member: StaffMember, rowStart: number, rowEnd: number) {
  const breakWindow = getBreakWindow(member);
  return breakWindow.start <= rowStart && breakWindow.end >= rowEnd;
}

function buildSegments(rows: SlotAssignment[], column: ColumnKey): SegmentCell[] {
  const segments: SegmentCell[] = new Array(rows.length).fill(null);
  let index = 0;

  while (index < rows.length) {
    const value =
      column === "break"
        ? breakSignature(rows[index].break)
        : rows[index][column].join("|");

    let span = 1;
    while (index + span < rows.length) {
      const nextValue =
        column === "break"
          ? breakSignature(rows[index + span].break)
          : rows[index + span][column].join("|");
      if (nextValue !== value) break;
      span += 1;
    }

    segments[index] = { rowSpan: span };
    index += span;
  }

  return segments;
}

function timeOptions() {
  const values: number[] = [];
  for (let minute = SLOT_START; minute <= SLOT_END; minute += SLOT_STEP) {
    values.push(minute);
  }
  return values;
}

const TIME_OPTIONS = timeOptions();

function assignLunchBreaks(members: StaffMember[]) {
  const breaksPerRow = Array(TIME_ROWS.length).fill(0);

  const rowCapacity = TIME_ROWS.map((row) => {
    const availableCount = members.filter((member) =>
      isStaffAvailableForSlot(member, row.start, row.end)
    ).length;
    return Math.max(0, availableCount - dutyNeedForRow(row.start, row.end));
  });

  const lunchBreaks: Record<string, BreakWindow> = Object.fromEntries(
    members.map((m) => [m.name, null])
  );

  const sortedMembers = [...members].sort((a, b) => {
    const aWindow = (a.availableEnd ?? SLOT_END) - (a.availableStart ?? SLOT_START);
    const bWindow = (b.availableEnd ?? SLOT_END) - (b.availableStart ?? SLOT_START);
    if (aWindow !== bWindow) return aWindow - bWindow;
    return a.name.localeCompare(b.name);
  });

  sortedMembers.forEach((member, memberIndex) => {
    const possibleStarts: { index: number; score: number }[] = [];

    for (let startIndex = 0; startIndex <= TIME_ROWS.length - LUNCH_BREAK_SLOTS; startIndex += 1) {
      const endIndex = startIndex + LUNCH_BREAK_SLOTS - 1;
      const windowStart = TIME_ROWS[startIndex].start;
      const windowEnd = TIME_ROWS[endIndex].end;

      if (!isStaffEligibleForBreakSlot(member, windowStart, windowEnd)) continue;

      let feasible = true;
      let score = 0;

      for (let i = startIndex; i <= endIndex; i += 1) {
        if (breaksPerRow[i] >= rowCapacity[i]) {
          feasible = false;
          break;
        }
        score += breaksPerRow[i] * 10 + Math.max(0, 3 - rowCapacity[i]);
      }

      if (feasible) {
        const centreBias = Math.abs(
          startIndex - Math.floor((TIME_ROWS.length - LUNCH_BREAK_SLOTS) / 2)
        );
        score += centreBias + memberIndex;
        possibleStarts.push({ index: startIndex, score });
      }
    }

    if (!possibleStarts.length) return;

    possibleStarts.sort((a, b) => a.score - b.score || a.index - b.index);
    const chosenStart = possibleStarts[0].index;
    const chosenEnd = chosenStart + LUNCH_BREAK_SLOTS - 1;

    for (let i = chosenStart; i <= chosenEnd; i += 1) {
      breaksPerRow[i] += 1;
    }

    lunchBreaks[member.name] = {
      start: TIME_ROWS[chosenStart].start,
      end: TIME_ROWS[chosenEnd].end,
    };
  });

  return lunchBreaks;
}

export default function Home() {
  const [staff, setStaff] = useState<StaffMember[]>(DEFAULT_STAFF);
  const [input, setInput] = useState("");
  const [weekCommencing, setWeekCommencing] = useState("2026-03-23");
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");
  const [absentByDay, setAbsentByDay] = useState<Record<DayName, string[]>>(
    buildInitialAbsenceState()
  );

  const addStaff = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (staff.some((member) => member.name === trimmed)) {
      setInput("");
      return;
    }
    setStaff([...staff, { name: trimmed }]);
    setInput("");
  };

  const removeStaff = (name: string) => {
    setStaff((prev) => prev.filter((member) => member.name !== name));
    setAbsentByDay((prev) => {
      const next = { ...prev };
      DAYS.forEach((day) => {
        next[day] = next[day].filter((staffName) => staffName !== name);
      });
      return next;
    });
  };

  const updateStaffWindow = (
    name: string,
    field: "availableStart" | "availableEnd",
    value: string
  ) => {
    const numericValue = value === "all" ? undefined : Number(value);
    setStaff((prev) =>
      prev.map((member) => {
        if (member.name !== name) return member;
        const updated = { ...member, [field]: numericValue };
        if (
          updated.availableStart !== undefined &&
          updated.availableEnd !== undefined &&
          updated.availableStart > updated.availableEnd
        ) {
          if (field === "availableStart") updated.availableEnd = updated.availableStart;
          if (field === "availableEnd") updated.availableStart = updated.availableEnd;
        }
        return updated;
      })
    );
  };

  const clearStaffWindow = (name: string) => {
    setStaff((prev) =>
      prev.map((member) =>
        member.name === name
          ? { ...member, availableStart: undefined, availableEnd: undefined }
          : member
      )
    );
  };

  const toggleAbsent = (day: DayName, name: string) => {
    setAbsentByDay((prev) => {
      const current = prev[day];
      return {
        ...prev,
        [day]: current.includes(name)
          ? current.filter((staffName) => staffName !== name)
          : [...current, name],
      };
    });
  };

  const weekSchedule = useMemo<Record<DayName, DayPlan>>(() => {
    const result = {} as Record<DayName, DayPlan>;

    DAYS.forEach((day, dayIndex) => {
      const absent = absentByDay[day] || [];
      const availableMembers = staff.filter((member) => !absent.includes(member.name));
      const lunchBreaks = assignLunchBreaks(availableMembers);

      const rows: SlotAssignment[] = [];
      const loadCount = Object.fromEntries(availableMembers.map((member) => [member.name, 0]));
      let previousLocation = Object.fromEntries(
        availableMembers.map((member) => [member.name, null as ColumnKey | null])
      );

      const rotationIndex = availableMembers.length ? (dayIndex * 2) % availableMembers.length : 0;
      const rotatedNames = [
        ...availableMembers.slice(rotationIndex).map((member) => member.name),
        ...availableMembers.slice(0, rotationIndex).map((member) => member.name),
      ];
      const orderIndex = Object.fromEntries(
        rotatedNames.map((name, index) => [name, index])
      );

      let warning: string | null = null;

      TIME_ROWS.forEach((row) => {
        const slotAssignment: SlotAssignment = {
          hall: [],
          ks1: [],
          ks2: [],
          break: { lunch: [], spare: [] },
        };

        const assignedThisSlot = new Set<string>();
        const currentLocation = Object.fromEntries(
          availableMembers.map((member) => [member.name, null as ColumnKey | null])
        );

        (["hall", "ks1", "ks2"] as const).forEach((column) => {
          const needed = requiredCount(column, row.start, row.end);
          if (!needed) return;

          const continuing = rows.length
            ? rows[rows.length - 1][column].filter((name) => {
                const member = availableMembers.find((m) => m.name === name);
                const lunch = lunchBreaks[name];
                const onLunch =
                  !!lunch && row.start >= lunch.start && row.end <= lunch.end;
                return (
                  !!member &&
                  !onLunch &&
                  isStaffAvailableForSlot(member, row.start, row.end) &&
                  !assignedThisSlot.has(name)
                );
              })
            : [];

          continuing.forEach((name) => {
            if (slotAssignment[column].length < needed) {
              slotAssignment[column].push(name);
              assignedThisSlot.add(name);
              currentLocation[name] = column;
            }
          });

          const pickCandidates = (sameLocationOnly: boolean) =>
            availableMembers
              .filter((member) => {
                if (assignedThisSlot.has(member.name)) return false;
                if (!isStaffAvailableForSlot(member, row.start, row.end)) return false;

                const lunch = lunchBreaks[member.name];
                const onLunch =
                  !!lunch && row.start >= lunch.start && row.end <= lunch.end;
                if (onLunch) return false;

                const prev = previousLocation[member.name];
                if (sameLocationOnly && prev && prev !== column) return false;

                return true;
              })
              .sort((a, b) => {
                const aWindow =
                  (a.availableEnd ?? SLOT_END) - (a.availableStart ?? SLOT_START);
                const bWindow =
                  (b.availableEnd ?? SLOT_END) - (b.availableStart ?? SLOT_START);
                if (aWindow !== bWindow) return aWindow - bWindow;

                const aLoad = loadCount[a.name] ?? 0;
                const bLoad = loadCount[b.name] ?? 0;
                if (aLoad !== bLoad) return aLoad - bLoad;

                const aOrder = orderIndex[a.name] ?? 999;
                const bOrder = orderIndex[b.name] ?? 999;
                if (aOrder !== bOrder) return aOrder - bOrder;

                return a.name.localeCompare(b.name);
              });

          [true, false].forEach((sameLocationOnly) => {
            pickCandidates(sameLocationOnly).forEach((member) => {
              if (slotAssignment[column].length >= needed) return;
              if (assignedThisSlot.has(member.name)) return;
              slotAssignment[column].push(member.name);
              assignedThisSlot.add(member.name);
              currentLocation[member.name] = column;
            });
          });

          if (slotAssignment[column].length < needed && !warning) {
            warning = `Not enough staff to cover ${column.toUpperCase()} at ${row.label}.`;
          }
        });

        const lunch: string[] = [];
        const spare: string[] = [];

        availableMembers.forEach((member) => {
          const lunchWindow = lunchBreaks[member.name];
          const onLunch =
            !!lunchWindow && row.start >= lunchWindow.start && row.end <= lunchWindow.end;
          const onDuty =
            slotAssignment.hall.includes(member.name) ||
            slotAssignment.ks1.includes(member.name) ||
            slotAssignment.ks2.includes(member.name);

          if (onLunch && !onDuty) {
            lunch.push(
              `${member.name} (${formatTime(lunchWindow.start)}–${formatTime(
                lunchWindow.end
              )})`
            );
          } else if (!onDuty && isStaffAvailableForSlot(member, row.start, row.end)) {
            spare.push(member.name);
          }
        });

        slotAssignment.break = { lunch, spare };

        availableMembers.forEach((member) => {
          const location = currentLocation[member.name];
          if (location === "hall" || location === "ks1" || location === "ks2") {
            loadCount[member.name] += 1;
          }
        });

        previousLocation = currentLocation;
        rows.push(slotAssignment);
      });

      const noLunchNames = availableMembers
        .filter((member) => !lunchBreaks[member.name])
        .map((member) => member.name);

      if (!warning && noLunchNames.length) {
        warning = `Unable to place a full 30-minute lunch break for: ${noLunchNames.join(", ")}.`;
      } else if (warning && noLunchNames.length) {
        warning += ` Unable to place a full 30-minute lunch break for: ${noLunchNames.join(", ")}.`;
      }

      result[day] = { rows, absent, warning, lunchBreaks };
    });

    return result;
  }, [staff, absentByDay]);

  const dayPlan = weekSchedule[selectedDay];
  const weekDisplay = formatDateForDisplay(weekCommencing);
  const selectedDayDate = addDays(weekCommencing, DAYS.indexOf(selectedDay));

  const segments = {
    hall: buildSegments(dayPlan.rows, "hall"),
    ks1: buildSegments(dayPlan.rows, "ks1"),
    ks2: buildSegments(dayPlan.rows, "ks2"),
    break: buildSegments(dayPlan.rows, "break"),
  };

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

  function breakCellContent(breakInfo: BreakAssignment) {
    if (!breakInfo.lunch.length && !breakInfo.spare.length) {
      return <span className="emptyText">—</span>;
    }

    return (
      <div className="breakGroups">
        {breakInfo.lunch.length ? (
          <div className="breakGroup">
            <div className="breakGroupTitle">On lunch break</div>
            {cellNames(breakInfo.lunch)}
          </div>
        ) : null}
        {breakInfo.spare.length ? (
          <div className="breakGroup">
            <div className="breakGroupTitle">Spare</div>
            {cellNames(breakInfo.spare)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="hero noPrint">
        <div>
          <h1>School Lunch & Playtime Rota</h1>
          <p>
            Lunch breaks are now allocated first, then duties are built around them
            so every possible 30-minute lunch break is protected before cover is assigned.
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

        <div className="legend">
          <div className="legendItem"><span className="legendSwatch hall" /> Hall</div>
          <div className="legendItem"><span className="legendSwatch ks1" /> KS1 Playground</div>
          <div className="legendItem"><span className="legendSwatch ks2" /> KS2 Playground</div>
          <div className="legendItem"><span className="legendSwatch break" /> Break / spare</div>
          <div className="legendItem"><span className="legendSwatch absent" /> Absent for selected day</div>
        </div>
      </div>

      <div className="configCard noPrint">
        <div className="configHeader">
          <h3>Staff availability windows</h3>
          <p>
            The planner stays clean, but the engine still respects these timings for
            cover and lunch break allocation.
          </p>
        </div>
        <div className="configTableWrap">
          <table className="configTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Available from</th>
                <th>Available until</th>
                <th>Summary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.name}>
                  <td>{member.name}</td>
                  <td>
                    <select
                      value={member.availableStart ?? "all"}
                      onChange={(e) =>
                        updateStaffWindow(member.name, "availableStart", e.target.value)
                      }
                      className="configSelect"
                    >
                      <option value="all">All lunch</option>
                      {TIME_OPTIONS.map((value) => (
                        <option key={`start-${member.name}-${value}`} value={value}>
                          {formatTime(value)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={member.availableEnd ?? "all"}
                      onChange={(e) =>
                        updateStaffWindow(member.name, "availableEnd", e.target.value)
                      }
                      className="configSelect"
                    >
                      <option value="all">All lunch</option>
                      {TIME_OPTIONS.map((value) => (
                        <option key={`end-${member.name}-${value}`} value={value}>
                          {formatTime(value)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{availabilityLabel(member)}</td>
                  <td>
                    <button
                      onClick={() => clearStaffWindow(member.name)}
                      className="miniButton"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => removeStaff(member.name)}
                      className="miniButton danger"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <span>Hall 2 then 3</span>
            <span>KS1 4</span>
            <span>KS2 3</span>
            <span>Absent {dayPlan.absent.length}</span>
          </div>
        </div>

        {dayPlan.warning ? <div className="warningBox">{dayPlan.warning}</div> : null}

        <div className="absenceCard noPrint">
          <div className="absenceHeader">
            <h3>Who is absent or unavailable on {selectedDay}?</h3>
            <p>Click a name to toggle them out for this day only.</p>
          </div>
          <div className="absencePills">
            {staff.map((member) => {
              const isAbsent = dayPlan.absent.includes(member.name);
              return (
                <button
                  key={member.name}
                  className={`absencePill ${isAbsent ? "absent" : "present"}`}
                  onClick={() => toggleAbsent(selectedDay, member.name)}
                >
                  <span className="pillTitle">{member.name}</span>
                  <span className="pillSub">{availabilityLabel(member)}</span>
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
                <th>Break / spare</th>
              </tr>
            </thead>
            <tbody>
              {TIME_ROWS.map((row, index) => (
                <tr key={row.id}>
                  <td className="timeCell">{row.label}</td>
                  {segments.hall[index] ? (
                    <td className="hallCell" rowSpan={segments.hall[index]!.rowSpan}>
                      {cellNames(dayPlan.rows[index].hall)}
                    </td>
                  ) : null}
                  {segments.ks1[index] ? (
                    <td className="ks1Cell" rowSpan={segments.ks1[index]!.rowSpan}>
                      {cellNames(dayPlan.rows[index].ks1)}
                    </td>
                  ) : null}
                  {segments.ks2[index] ? (
                    <td className="ks2Cell" rowSpan={segments.ks2[index]!.rowSpan}>
                      {cellNames(dayPlan.rows[index].ks2)}
                    </td>
                  ) : null}
                  {segments.break[index] ? (
                    <td className="breakCell" rowSpan={segments.break[index]!.rowSpan}>
                      {breakCellContent(dayPlan.rows[index].break)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="footerNote">
          <strong>Absent staff:</strong>{" "}
          {dayPlan.absent.length ? dayPlan.absent.join(", ") : "None"}
        </div>
      </section>

      <style jsx>{`
        .page { min-height: 100vh; padding: 24px; background: radial-gradient(circle at top left, #eef6ff 0%, #f8fafc 36%, #f5f3ff 100%); color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
        .hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        h1 { margin: 0 0 8px; font-size: 32px; }
        p { margin: 0; color: #475569; max-width: 860px; }
        .summaryCard, .toolbarCard, .dayCard, .absenceCard, .configCard { background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border: 1px solid rgba(148,163,184,0.22); box-shadow: 0 10px 30px rgba(15,23,42,0.08); border-radius: 20px; }
        .summaryCard { min-width: 140px; padding: 18px 22px; text-align: center; }
        .summaryValue { font-size: 30px; font-weight: 700; line-height: 1; }
        .summaryLabel { margin-top: 8px; color: #64748b; font-size: 14px; }
        .toolbarCard, .configCard { padding: 18px; margin-bottom: 24px; }
        .toolbarTop { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; align-items: end; }
        .staffInput, .configSelect { flex: 1 1 240px; min-width: 180px; padding: 12px 14px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 15px; outline: none; background: white; }
        .staffInput:focus, .configSelect:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.14); }
        .dateBlock { display: flex; flex-direction: column; gap: 6px; min-width: 220px; }
        .dateBlock label { font-size: 14px; font-weight: 700; color: #334155; }
        .primaryButton, .secondaryButton, .dayTab, .miniButton { border-radius: 12px; padding: 12px 18px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .primaryButton { border: 0; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; }
        .secondaryButton, .miniButton { border: 1px solid #cbd5e1; background: white; color: #0f172a; }
        .miniButton { padding: 8px 10px; margin-right: 8px; font-size: 12px; }
        .miniButton.danger { color: #991b1b; border-color: #fecaca; background: #fff1f2; }
        .dayTabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
        .dayTab { border: 1px solid #cbd5e1; background: white; color: #334155; }
        .dayTab.active { background: #0f172a; color: white; border-color: #0f172a; }
        .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; color: #475569; }
        .legendItem { display: flex; align-items: center; gap: 8px; }
        .legendSwatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
        .legendSwatch.hall { background: #dbeafe; }
        .legendSwatch.ks1 { background: #ccfbf1; }
        .legendSwatch.ks2 { background: #fef3c7; }
        .legendSwatch.break { background: #ede9fe; }
        .legendSwatch.absent { background: #fee2e2; }
        .configHeader { margin-bottom: 12px; }
        .configHeader h3, .absenceHeader h3 { margin: 0 0 6px; font-size: 16px; }
        .configTableWrap, .tableWrap { overflow-x: auto; }
        .configTable { width: 100%; border-collapse: collapse; min-width: 900px; }
        .configTable th, .configTable td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .dayCard { padding: 18px; page-break-after: always; break-after: page; }
        .dayHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .dayHeader h2 { margin: 0; font-size: 22px; }
        .printMeta { color: #64748b; font-size: 14px; margin-top: 4px; }
        .dayMeta { display: flex; gap: 8px; flex-wrap: wrap; }
        .dayMeta span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; font-size: 13px; color: #334155; }
        .warningBox { margin-bottom: 14px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: 14px; padding: 12px 14px; font-weight: 600; }
        .absenceCard { padding: 16px; margin-bottom: 16px; background: rgba(248,250,252,0.95); }
        .absencePills { display: flex; flex-wrap: wrap; gap: 8px; }
        .absencePill { border-radius: 16px; padding: 8px 12px; cursor: pointer; border: 1px solid transparent; text-align: left; display: flex; flex-direction: column; gap: 2px; }
        .absencePill.present { background: #ecfeff; color: #155e75; border-color: #a5f3fc; }
        .absencePill.absent { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .pillTitle { font-weight: 700; }
        .pillSub { font-size: 11px; opacity: 0.8; }
        .rotaTable { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; font-size: 14px; }
        .rotaTable th { text-align: left; padding: 12px; background: #0f172a; color: white; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; }
        .rotaTable th:first-child { border-top-left-radius: 14px; }
        .rotaTable th:last-child { border-top-right-radius: 14px; border-right: 0; }
        .rotaTable td { vertical-align: top; padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .rotaTable tbody tr td:first-child { border-left: 1px solid #e2e8f0; }
        .timeCol { width: 110px; }
        .timeCell { background: #f8fafc; font-weight: 700; color: #334155; white-space: nowrap; font-size: 12px; }
        .hallCell { background: #eff6ff; }
        .ks1Cell { background: #f0fdfa; }
        .ks2Cell { background: #fffbeb; }
        .breakCell { background: #f5f3ff; }
        .nameList { display: flex; flex-direction: column; gap: 4px; }
        .nameChip { background: rgba(255,255,255,0.92); border: 1px solid rgba(148,163,184,0.2); border-radius: 10px; padding: 5px 7px; color: #1e293b; font-weight: 700; }
        .breakGroups { display: flex; flex-direction: column; gap: 10px; }
        .breakGroup { display: flex; flex-direction: column; gap: 4px; }
        .breakGroupTitle { font-size: 12px; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.03em; }
        .emptyText { color: #94a3b8; }
        .footerNote { margin-top: 14px; font-size: 14px; color: #475569; }
        @media (max-width: 700px) { .page { padding: 14px; } h1 { font-size: 26px; } }
        @media print {
          .noPrint { display: none !important; }
          .page { background: white !important; padding: 0 !important; }
          .dayCard { box-shadow: none !important; border: none !important; background: white !important; margin: 0 0 20px 0; padding: 0 !important; }
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
