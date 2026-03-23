'use client'

import { useState, useMemo } from "react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

const SLOTS = [
  { id: "hall", label: "Hall", count: 3 },
  { id: "ks1", label: "KS1", count: 4 },
  { id: "ks2", label: "KS2", count: 3 },
];

export default function Home() {
  const [staff, setStaff] = useState<string[]>([
    "Alice","Ben","Chloe","Dan","Ella","Freddie","Grace","Harry","Isla","Jack","Katie","Leo","Mia","Noah"
  ]);

  const [input, setInput] = useState("");

  const schedule = useMemo(() => {
    const result:any = {};

    DAYS.forEach(day => {
      let available = [...staff];
      const dayPlan:any = {};

      SLOTS.forEach(slot => {
        dayPlan[slot.id] = available.splice(0, slot.count);
      });

      result[day] = dayPlan;
    });

    return result;
  }, [staff]);

  return (
    <div style={{padding:20,fontFamily:"Arial"}}>
      <h1>School Lunch Rota</h1>

      <div style={{marginBottom:20}}>
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Add staff"
        />
        <button onClick={()=>{
          setStaff([...staff,input]);
          setInput("");
        }}>Add</button>
      </div>

      {DAYS.map(day=>(
        <div key={day} style={{marginBottom:20}}>
          <h2>{day}</h2>

          {SLOTS.map(slot=>(
            <div key={slot.id}>
              <strong>{slot.label}:</strong>{" "}
              {schedule[day][slot.id].join(", ")}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
