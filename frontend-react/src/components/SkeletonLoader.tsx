import React from 'react'

export default function SkeletonLoader({lines=3}:{lines?:number}){
  return (
    <div aria-hidden="true">
      {Array.from({length:lines}).map((_,i)=> <div key={i} style={{marginBottom:8}} className="skeleton" />)}
    </div>
  )
}
