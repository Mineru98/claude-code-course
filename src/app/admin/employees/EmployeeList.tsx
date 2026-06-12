'use client'
import { useEffect, useState } from 'react'

interface Emp { id: string; email: string; name: string; jobTitle: string | null; status: string }

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Emp[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then(async res => {
        if (!res.ok) { setError((await res.json()).error?.message ?? '오류'); return }
        setEmployees((await res.json()).employees)
      })
  }, [])

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr><th style={cell}>이름</th><th style={cell}>이메일</th><th style={cell}>직책</th><th style={cell}>상태</th></tr>
      </thead>
      <tbody>
        {employees.map(e => (
          <tr key={e.id}>
            <td style={cell}>{e.name}</td><td style={cell}>{e.email}</td>
            <td style={cell}>{e.jobTitle ?? '-'}</td><td style={cell}>{e.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const cell: React.CSSProperties = { border: '1px solid #ddd', padding: 8, textAlign: 'left' }
