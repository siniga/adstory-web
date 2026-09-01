import React, { useEffect, useState } from 'react'

export default function DebugPanel({ pageName, loading, dataCount, requestTriggered }) {
  const [logs, setLogs] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  // Track request started
  useEffect(() => {
    if (requestTriggered) {
      const msg = `[${pageName}] request started`
      console.log(msg)
      setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), text: msg }])
    }
  }, [requestTriggered, pageName])

  // Track response received and data count
  useEffect(() => {
    if (requestTriggered && !loading) {
      const msg1 = `[${pageName}] response received`
      const msg2 = `[${pageName}] data count: ${dataCount}`
      console.log(msg1)
      console.log(msg2)
      setLogs((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), text: msg1 },
        { time: new Date().toLocaleTimeString(), text: msg2 },
      ])
    }
  }, [loading, dataCount, requestTriggered, pageName])

  // Track loading false
  useEffect(() => {
    if (!loading) {
      const msg = `[${pageName}] loading false`
      console.log(msg)
      setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), text: msg }])
    }
  }, [loading, pageName])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '11px',
        width: isOpen ? '300px' : 'auto',
        maxHeight: '250px',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          background: 'rgba(30, 41, 59, 0.9)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          borderBottom: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        }}
      >
        <span>🛠️ {pageName} Debug Logs</span>
        <span>{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <div style={{ padding: '8px 12px' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No logs yet.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#64748b' }}>{log.time}</span>
                <span style={{ color: '#38bdf8' }}>{log.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
