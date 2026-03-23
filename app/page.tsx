'use client'

import { useState, useMemo } from "react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

const SLOTS = [
  { id: "hall", label: "Hall", count: 3 },
  { id: "ks1", label: "KS1 Playground", count: 4 },
  { id: "ks2", label: "KS2 Playground", count: 3 },
];

export default function Home() {
  const [staff, setStaff] = useState<string[]>([
    "Alice","Ben","Chloe","Dan","Ella","Freddie","Grace","Harry","Isla","Jack","Katie","Leo","Mia","Noah"
  ]);

  const [input, setInput] = useState("");

  const addStaff = () => {
    if (!input.trim()) return;
    setStaff([...staff, input.trim()]);
    setInput("");
  };

  const removeStaff = (name:string) => {
    setStaff(staff.filter(s => s !== name));
  };

  // SMARTER ROTATION
  const schedule = useMemo(() => {
    const result:any = {};
    let rotationIndex = 0;

    DAYS.forEach(day => {
      const dayPlan:any = {};
      const rotated = [
        ...staff.slice(rotationIndex),
        ...staff.slice(0, rotationIndex)
      ];

      let pointer = 0;

      SLOTS.forEach(slot => {
        dayPlan[slot.id] = rotated.slice(pointer, pointer + slot.count);
        pointer += slot.count;
      });

      rotationIndex = (rotationIndex + 3) % staff.length; // rotate daily

      result[day] = dayPlan;
    });

    return result;
  }, [staff]);

  return (
    <div style={{
      padding:20,
      fontFamily:"Arial",
      background:"#f5f7fb",
      minHeight:"100vh"
    }}>
      <h1 style={{marginBottom:20}}>School Lunch Rota</h1>

      {/* ADD STAFF */}
      <div style={{
        background:"white",
        padding:15,
        borderRadius:10,
        marginBottom:20
      }}>
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Add staff member"
          style={{marginRight:10}}
        />
        <button onClick={addStaff}>Add</button>

        <div style={{marginTop:10}}>
          {staff.map(name => (
            <span key={name} style={{
              display:"inline-block",
              background:"#e3e8ff",
              padding:"5px 10px",
              borderRadius:20,
              margin:5,
              cursor:"pointer"
            }}
            onClick={()=>removeStaff(name)}
            >
              {name} ✕
            </span>
          ))}
        </div>
      </div>

      {/* WEEK VIEW */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))",gap:20}}>
        {DAYS.map(day => (
          <div key={day} style={{
            background:"white",
            padding:15,
            borderRadius:10
          }}>
            <h2>{day}</h2>

            {SLOTS.map(slot => (
              <div key={slot.id} style={{marginTop:10}}>
                <strong>{slot.label}</strong>
                <div>
                  {schedule[day][slot.id].map((name:string) => (
                    <div key={name}>{name}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
