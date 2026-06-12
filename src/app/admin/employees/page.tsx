import EmployeeList from './EmployeeList'

export default function AdminEmployeesPage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>직원 관리</h1>
      <EmployeeList />
    </main>
  )
}
