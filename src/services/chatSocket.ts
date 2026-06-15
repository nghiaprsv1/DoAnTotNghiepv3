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
    // Vite dev server proxies HTTP traffic but socket.io needs an explicit URL
    // when there is no proxy. Default to the API origin from axios config.
    const apiUrl =
      (typeof window !== 'undefined' && window.location.origin.replace(/:\d+$/, ':8080')) ||
      'http://localhost:8080'
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
