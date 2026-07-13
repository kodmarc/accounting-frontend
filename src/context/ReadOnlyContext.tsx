import { createContext, useContext } from 'react'

const ReadOnlyContext = createContext<boolean>(false)

export const ReadOnlyProvider = ReadOnlyContext.Provider

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext)
}
