import React, {useState} from 'react'

export default function AddItem({onAdd}:{onAdd:(name:string)=>void}){
  const [value,setValue]=useState('')
  return (
    <form onSubmit={(e)=>{e.preventDefault(); if(value.trim()){onAdd(value.trim()); setValue('')}}} aria-label="Aggiungi elemento">
      <label style={{display:'block',marginBottom:8}}>
        <input aria-label="Nome elemento" value={value} onChange={e=>setValue(e.target.value)} style={{padding:8,width:'100%'}} />
      </label>
      <button className="btn" type="submit">Aggiungi</button>
    </form>
  )
}
