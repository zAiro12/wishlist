import React, {useEffect, useState} from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'

type Wishlist = {id:string, name:string, owner:string}

export default function HomePage(){
  const [lists,setLists] = useState<Wishlist[] | null>(null)
  useEffect(()=>{
    // mock fetch
    const timeoutId = setTimeout(
      ()=> setLists([{id:'1',name:'Gifts for Luca', owner:'me'},{id:'2',name:'Friends', owner:'cricca'}]),
      800
    )

    return ()=>{
      clearTimeout(timeoutId)
    }
  },[])

  if(lists===null) return <div className="container"><SkeletonLoader lines={4} /></div>
  if(lists.length===0) return <EmptyState title="Nessuna wishlist" description="Crea la tua prima wishlist!" />

  return (
    <div className="container">
      <h1>Liste</h1>
      <div className="list" role="list">
        {lists.map(l=> (
          <article key={l.id} className="card" role="listitem">
            <h3>{l.name}</h3>
            <p>Owner: {l.owner}</p>
            <Link to={`/wishlist/${l.id}`} aria-label={`Apri ${l.name}`} className="btn">Apri</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
