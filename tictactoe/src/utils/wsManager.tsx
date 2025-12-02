// wsManager.ts
type OnMessage = (data: any) => void
type OnOpen = () => void
type OnClose = () => void

export class WSManager {
  private url: string
  private ws: WebSocket | null = null
  private onMsg: OnMessage
  private onOpen?: OnOpen
  private onClose?: OnClose
  private pingInterval = 10000
  private reconnectDelay = 1000
  private shouldReconnect = true
  private pingTimer: any = null

  constructor(url: string, onMsg: OnMessage, onOpen?: OnOpen, onClose?: OnClose) {
    this.url = url
    this.onMsg = onMsg
    this.onOpen = onOpen
    this.onClose = onClose
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.onOpen?.()
      this.startPing()
    }
    this.ws.onmessage = (ev) => {
      try { this.onMsg(JSON.parse(ev.data)) } catch { this.onMsg(ev.data) }
    }
    this.ws.onclose = () => {
      this.onClose?.()
      this.stopPing()
      if (this.shouldReconnect) setTimeout(() => this.connect(), this.reconnectDelay)
    }
    this.ws.onerror = () => {
      // errors are handled via close events; we can log optionally
    }
  }

  send(obj: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
      return true
    }
    return false
  }

  close() {
    this.shouldReconnect = false
    this.stopPing()
    this.ws?.close()
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      try { this.send({ type: 'ping' }) } catch {}
    }, this.pingInterval)
  }
  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
  }
}
