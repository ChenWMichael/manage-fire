import { useEffect, useRef, useState } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (stored: string) => T = (s) => JSON.parse(s) as T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serRef = useRef(serialize)
  const desRef = useRef(deserialize)

  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? desRef.current(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serRef.current(value))
    } catch {
      // Quota exceeded or private browsing — silently ignore
    }
  }, [key, value])

  return [value, setValue]
}
