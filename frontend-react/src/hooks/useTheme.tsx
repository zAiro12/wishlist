import React, {createContext, useContext, useEffect, useState} from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext({theme: 'light' as Theme, toggle: () => {}})

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [theme, setTheme] = useState<Theme>(() => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
  useEffect(()=>{
    if(theme==='dark') document.documentElement.style.setProperty('--color-bg','#0b1220') , document.documentElement.style.setProperty('--color-text','#e6eef8') , document.documentElement.style.setProperty('--color-surface','#071028')
    else document.documentElement.style.setProperty('--color-bg','#ffffff') , document.documentElement.style.setProperty('--color-text','#111827') , document.documentElement.style.setProperty('--color-surface','#f6f6fb')
  },[theme])
  return <ThemeContext.Provider value={{theme, toggle: ()=>setTheme(t=>t==='light'?'dark':'light')}}>{children}</ThemeContext.Provider>
}

export const useTheme = ()=> useContext(ThemeContext)
