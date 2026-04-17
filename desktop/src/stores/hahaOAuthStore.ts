// desktop/src/stores/hahaOAuthStore.ts

import { create } from 'zustand'
import { hahaOAuthApi, type HahaOAuthStatus } from '../api/hahaOAuth'

const POLL_INTERVAL_MS = 2_000

type HahaOAuthState = {
  status: HahaOAuthStatus | null
  isPolling: boolean
  isLoading: boolean
  error: string | null

  fetchStatus: () => Promise<void>
  login: () => Promise<{ authorizeUrl: string }>
  logout: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
}

export const useHahaOAuthStore = create<HahaOAuthState>((set, get) => {
  let pollTimer: ReturnType<typeof setInterval> | null = null

  return {
    status: null,
    isPolling: false,
    isLoading: false,
    error: null,

    fetchStatus: async () => {
      try {
        const status = await hahaOAuthApi.status()
        set({ status, error: null })
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
      }
    },

    login: async () => {
      set({ isLoading: true, error: null })
      try {
        const res = await hahaOAuthApi.start()
        set({ isLoading: false })
        get().startPolling()
        return { authorizeUrl: res.authorizeUrl }
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },

    logout: async () => {
      set({ isLoading: true })
      try {
        await hahaOAuthApi.logout()
        set({ status: { loggedIn: false }, isLoading: false })
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },

    startPolling: () => {
      if (pollTimer) return
      set({ isPolling: true })
      pollTimer = setInterval(async () => {
        await get().fetchStatus()
        const cur = get().status
        if (cur && cur.loggedIn) {
          get().stopPolling()
        }
      }, POLL_INTERVAL_MS)
    },

    stopPolling: () => {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      set({ isPolling: false })
    },
  }
})
