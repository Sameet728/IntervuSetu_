import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL
  || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/interview`
const MAX_RECONNECT_ATTEMPTS = 5

export function useWebSocket(interviewId, handlers = {}) {
  const ws = useRef(null)
  const handlersRef = useRef(handlers)
  const pingInterval = useRef(null)
  const reconnectTimeout = useRef(null)
  const reconnectAttempts = useRef(0)
  const manualClose = useRef(false)
  const connectRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const clearPing = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current)
      pingInterval.current = null
    }
  }, [])

  const clearReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
  }, [])

  const send = useCallback((type, payload = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log(`📤 Sending WS message: ${type}`, payload)
      ws.current.send(JSON.stringify({ type, payload }))
    } else {
      console.warn(`⚠️ Cannot send ${type}: WebSocket not open (state: ${ws.current?.readyState})`)
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    if (manualClose.current || reconnectTimeout.current) return
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return

    const attempt = reconnectAttempts.current + 1
    const delay = Math.min(1000 * attempt, 5000)

    reconnectAttempts.current = attempt
    reconnectTimeout.current = setTimeout(() => {
      reconnectTimeout.current = null
      connectRef.current?.()
    }, delay)
  }, [])

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token || !interviewId) return

    const readyState = ws.current?.readyState
    if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return

    manualClose.current = false
    clearReconnect()

    const url = `${WS_URL}?token=${token}&interviewId=${interviewId}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      if (ws.current !== socket) return

      console.log('✅ WebSocket opened, waiting for auth...')
      reconnectAttempts.current = 0
      clearPing()
      pingInterval.current = setInterval(() => send('PING', {}), 25000)
    }

    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        console.log(`📥 Received WS message: ${type}`, payload)
        
        if (type === 'connected') {
          console.log('✅ WebSocket fully authenticated')
          setConnected(true)
          if (handlersRef.current.connected) {
            handlersRef.current.connected()
          }
        }

        const handler = handlersRef.current[type]
        if (handler) handler(payload)
        else if (handlersRef.current.onAny) handlersRef.current.onAny(type, payload)
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    socket.onclose = (event) => {
      if (ws.current === socket) {
        ws.current = null
      }

      setConnected(false)
      clearPing()

      if (handlersRef.current.onDisconnect) {
        handlersRef.current.onDisconnect(event)
      }

      const recoverableClose = !event.wasClean && ![4001, 4002].includes(event.code)
      if (!manualClose.current && recoverableClose) {
        scheduleReconnect()
      }
    }

    socket.onerror = (event) => {
      console.error('WebSocket error:', event)
      if (handlersRef.current.onError) handlersRef.current.onError(event)
    }
  }, [clearPing, clearReconnect, interviewId, scheduleReconnect, send])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const disconnect = useCallback(() => {
    manualClose.current = true
    clearReconnect()
    clearPing()

    if (ws.current) {
      const socket = ws.current
      ws.current = null
      socket.close(1000, 'Client disconnect')
    }

    setConnected(false)
  }, [clearPing, clearReconnect])

  useEffect(() => {
    connect()

    return () => {
      manualClose.current = true
      clearReconnect()
      clearPing()

      if (ws.current) {
        const socket = ws.current
        ws.current = null
        socket.close(1000, 'Component unmounted')
      }
    }
  }, [clearPing, clearReconnect, connect])

  return { send, connected, reconnect: connect, disconnect }
}
