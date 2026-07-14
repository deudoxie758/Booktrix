'use client'

import { useEffect, useMemo, useState } from 'react'

type Role = 'USER' | 'OWNER' | 'EMPLOYEE' | 'ACCOUNTANT' | 'ADMIN'

const ROLE_OPTIONS: Role[] = ['USER', 'OWNER', 'EMPLOYEE', 'ACCOUNTANT', 'ADMIN']

type UserRow = {
  id: string
  email: string
  name: string | null
  role: Role
  createdAt: string
}

export default function AdminPanel({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    id: '',
    email: '',
    name: '',
    password: '',
    role: 'USER',
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users')
      }
      setUsers(data.users)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const resetForm = () => {
    setFormState({ id: '', email: '', name: '', password: '', role: 'USER' })
    setActiveUserId(null)
    setSuccessMessage('')
  }

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage('')
    const { id, email, name, password, role } = formState

    try {
      const method = id ? 'PUT' : 'POST'
      const body = JSON.stringify({ id: id || undefined, email, name, password: password || undefined, role })
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save user')
      }

      setSuccessMessage(id ? 'User updated successfully.' : 'User created successfully.')
      resetForm()
      fetchUsers()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleEdit = (user: UserRow) => {
    setActiveUserId(user.id)
    setFormState({
      id: user.id,
      email: user.email,
      name: user.name || '',
      password: '',
      role: user.role,
    })
    setSuccessMessage('')
    setError(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }
      setSuccessMessage('User deleted successfully.')
      fetchUsers()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const allowedRoles = useMemo(() => {
    if (userRole === 'OWNER') return ROLE_OPTIONS
    return ROLE_OPTIONS.filter((role) => role !== 'OWNER')
  }, [userRole])

  return (
    <div className='min-h-screen bg-gray-50 py-10'>
      <div className='max-w-7xl mx-auto px-6'>
        <div className='flex flex-col gap-6'>
          <div className='bg-white rounded-3xl shadow p-8'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-warm-600 font-semibold'>Administrator Control Center</p>
                <h1 className='text-3xl font-bold text-gray-900'>Manage Users & Access</h1>
                <p className='mt-2 text-sm text-gray-600 max-w-2xl'>Create, edit, or remove users and assign roles for owners, employees, accountants, and customers.</p>
              </div>
              <div className='rounded-3xl border border-gray-200 bg-warm-50 px-4 py-3 text-sm text-warm-700'>Your role: {userRole}</div>
            </div>
          </div>

          <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
            <div className='bg-white rounded-3xl shadow p-6'>
              <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900'>Users</h2>
                  <p className='text-sm text-gray-500'>All registered accounts in the system.</p>
                </div>
                <button
                  onClick={resetForm}
                  className='text-sm text-warm-600 hover:text-warm-700'
                >
                  New user
                </button>
              </div>

              <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='rounded-3xl border border-gray-200 bg-warm-50 p-4'>
                  <p className='text-sm text-gray-500'>Total Users</p>
                  <p className='text-3xl font-semibold text-gray-900'>{users.length}</p>
                </div>
                <div className='rounded-3xl border border-gray-200 bg-warm-50 p-4'>
                  <p className='text-sm text-gray-500'>Owners</p>
                  <p className='text-3xl font-semibold text-gray-900'>{users.filter((user) => user.role === 'OWNER').length}</p>
                </div>
                <div className='rounded-3xl border border-gray-200 bg-warm-50 p-4'>
                  <p className='text-sm text-gray-500'>Employees</p>
                  <p className='text-3xl font-semibold text-gray-900'>{users.filter((user) => user.role === 'EMPLOYEE').length}</p>
                </div>
                <div className='rounded-3xl border border-gray-200 bg-warm-50 p-4'>
                  <p className='text-sm text-gray-500'>Admins / Accountants</p>
                  <p className='text-3xl font-semibold text-gray-900'>{users.filter((user) => user.role === 'ADMIN' || user.role === 'ACCOUNTANT').length}</p>
                </div>
              </div>

              {loading ? (
                <div className='py-20 text-center text-gray-500'>Loading users…</div>
              ) : error ? (
                <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='min-w-full text-left text-sm'>
                    <thead className='border-b border-gray-200'>
                      <tr>
                        <th className='px-4 py-3 font-medium text-gray-500'>Name</th>
                        <th className='px-4 py-3 font-medium text-gray-500'>Email</th>
                        <th className='px-4 py-3 font-medium text-gray-500'>Role</th>
                        <th className='px-4 py-3 font-medium text-gray-500'>Joined</th>
                        <th className='px-4 py-3 font-medium text-gray-500'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {users.map((user) => (
                        <tr key={user.id} className='hover:bg-gray-50'>
                          <td className='px-4 py-4 text-gray-900'>{user.name || '—'}</td>
                          <td className='px-4 py-4 text-gray-600'>{user.email}</td>
                          <td className='px-4 py-4 text-gray-600'>{user.role}</td>
                          <td className='px-4 py-4 text-gray-500'>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className='px-4 py-4 text-sm text-gray-500 space-x-2'>
                            <button
                              onClick={() => handleEdit(user)}
                              className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-warm-400 hover:text-warm-600'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className='rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50'
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className='bg-white rounded-3xl shadow p-6'>
              <div className='mb-6'>
                <h2 className='text-xl font-semibold text-gray-900'>{activeUserId ? 'Edit User' : 'Create User'}</h2>
                <p className='text-sm text-gray-500'>Add or update a user account and assign a role.</p>
              </div>

              {successMessage && (
                <div className='mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700'>{successMessage}</div>
              )}
              {error && (
                <div className='mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>
              )}

              <div className='mb-6 rounded-3xl border border-gray-200 bg-white p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-base font-semibold text-gray-900'>Admin Settings</h3>
                    <p className='text-sm text-gray-500'>System actions and control panel shortcuts.</p>
                  </div>
                  <span className='text-xs uppercase tracking-wide text-warm-600'>beta</span>
                </div>
                <div className='mt-4 space-y-3 text-sm text-gray-600'>
                  <div className='rounded-2xl border border-gray-200 bg-warm-50 p-3'>
                    <p className='font-medium text-gray-900'>User management</p>
                    <p>Review accounts, update roles, and remove stale users.</p>
                  </div>
                  <div className='rounded-2xl border border-gray-200 bg-warm-50 p-3'>
                    <p className='font-medium text-gray-900'>System controls</p>
                    <p>Enable and disable platform features, review logs, and manage support workflows.</p>
                  </div>
                  <div className='rounded-2xl border border-gray-200 bg-warm-50 p-3'>
                    <p className='font-medium text-gray-900'>Audit and compliance</p>
                    <p>Track changes, export user data, and enforce role-based access.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Email</label>
                  <input
                    type='email'
                    value={formState.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className='w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Name</label>
                  <input
                    type='text'
                    value={formState.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className='w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Password</label>
                  <input
                    type='password'
                    value={formState.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className='w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                    placeholder={activeUserId ? 'Leave blank to keep current password' : ''}
                    required={!activeUserId}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Role</label>
                  <select
                    value={formState.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className='w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                  >
                    {allowedRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className='flex items-center justify-between gap-3'>
                  <button
                    type='submit'
                    className='inline-flex items-center justify-center rounded-2xl bg-warm-600 px-4 py-3 text-sm font-semibold text-white hover:bg-warm-700 transition'
                  >
                    {activeUserId ? 'Save changes' : 'Create user'}
                  </button>
                  {activeUserId && (
                    <button
                      type='button'
                      onClick={resetForm}
                      className='text-sm text-gray-500 hover:text-gray-700'
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
