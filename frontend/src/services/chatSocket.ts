import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Lazily get the singleton chat socket. Pass an access token on first call so
 * the gateway can authenticate the connection. Subsequent calls reuse the
 * same instance regardless of the token (caller is expected to refresh by
 * calling `disconnectChatSocket` then re-creating).
 */
export function getChatSocket(token: string): Socket {
  if (socket && socket.connected) return socket
  if (!socket) {
    // Suy ra origin của Socket.IO từ VITE_API_BASE_URL (bỏ hậu tố "/api").
    //  - Dev: VITE_API_BASE_URL trống → dùng origin hiện tại đổi port 8080.
    //  - Prod: VITE_API_BASE_URL = https://api.example.com/api → origin = https://api.example.com
    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
    let apiUrl: string
    if (apiBase && /^https?:\/\//.test(apiBase)) {
      apiUrl = apiBase.replace(/\/api\/?$/, '')
    } else {
      apiUrl =
        (typeof window !== 'undefined' &&
          window.location.origin.replace(/:\d+$/, ':8080')) ||
        'http://localhost:8080'
    }
    socket = io(`${apiUrl}/chat`, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
  } else {
    socket.auth = { token }
    socket.connect()
  }
  return socket
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
