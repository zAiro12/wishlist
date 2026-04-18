import React, {useEffect, useState} from 'react'
import { useParams } from 'react-router-dom'
import AddItem from '../components/AddItem'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'

type Item = {id:string, name:string}

export default function WishlistDetail(){
  const {id} = useParams()
  const [items,setItems] = useState<Item[] | null>(null)
  useEffect(()=>{
    setTimeout(()=> setItems([{id:'i1',name:'Libro'},{id:'i2',name:'Cuffie'}]), 700)
  },[id])

  const add = (name:string)=> setItems(prev=> prev? [{id:Date.now().toString(), name}, ...prev]: [{id:Date.now().toString(), name}])
  const removeItem = (itemId:string)=> setItems(prev=> prev? prev.filter(i=>i.id!==itemId): prev)

  if(items===null) return <div className="container"><SkeletonLoader lines={3} /></div>
  return (
    <div className="container">
      <h1>Wishlist {id}</h1>
      <AddItem onAdd={add} />
      {items.length===0 ? <EmptyState title="Vuota" description="Aggiungi un desiderio" /> : (
        <ul>
          {items.map(i=> (
            <li key={i.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>{i.name}</span>
              <button onClick={()=>removeItem(i.id)} aria-label={`Rimuovi ${i.name}`} className="btn">Rimuovi</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
