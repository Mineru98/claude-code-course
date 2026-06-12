'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/admin/employees')
    } else {
      const data = await res.json()
      setError(data.error?.message ?? '로그인 실패')
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>로그인</h1>
      <form onSubmit={onSubmit}>
        <div><input placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }} /></div>
        <div><input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }} /></div>
        <button type="submit" style={{ padding: '8px 16px', marginTop: 8 }}>로그인</button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  )
}
