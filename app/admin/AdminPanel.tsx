'use client'

import Link from 'next/link'
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

type SpaRow = {
  id: string
  name: string
  slug: string
  address: string | null
  email: string | null
  phone: string | null
  createdAt: string
  owner: {
    id: string
    email: string
    name: string | null
    role: Role
  } | null
  stats: {
    bookings: number
    reviews: number
    services: number
    employees: number
  }
}

type RoleAccessCard = {
  role: Role
  title: string
  summary: string
  capabilities: string[]
}

const ROLE_ACCESS: RoleAccessCard[] = [
  {
    role: 'ADMIN',
    title: 'Platform Admin',
    summary: 'Full oversight of users, spa listings, and platform-wide controls.',
    capabilities: ['Manage users and roles', 'Review spa listings', 'Moderate platform access'],
  },
  {
    role: 'OWNER',
    title: 'Spa Owner',
    summary: 'Owns and manages a spa business within the platform.',
    capabilities: ['Manage bookings', 'Review staff and services', 'Track spa performance'],
  },
  {
    role: 'EMPLOYEE',
    title: 'Staff Member',
    summary: 'Supports day-to-day operations for a spa.',
    capabilities: ['View assigned bookings', 'Update service status', 'Collaborate with owners'],
  },
  {
    role: 'ACCOUNTANT',
    title: 'Finance Partner',
    summary: 'Focuses on billing and payment oversight.',
    capabilities: ['Review payment activity', 'Monitor revenue status', 'Support platform finance tasks'],
  },
  {
    role: 'USER',
    title: 'Customer',
    summary: 'Books services and manages personal reservations.',
    capabilities: ['Book appointments', 'Track bookings', 'Leave reviews'],
  },
]

export default function AdminPanel({ userRole }: { userRole: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [spas, setSpas] = useState<SpaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [spaLoading, setSpaLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spaError, setSpaError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    id: '',
    email: '',
    name: '',
    password: '',
    role: 'USER' as Role,
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users')
      }
      setUsers(data.users || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpas = async () => {
    setSpaLoading(true)
    setSpaError(null)
    try {
      const res = await fetch('/api/admin/spas')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load spas')
      }
      setSpas(data.spas || [])
    } catch (err) {
      setSpaError((err as Error).message)
    } finally {
      setSpaLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
    void fetchSpas()
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
      void fetchUsers()
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
      void fetchUsers()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const allowedRoles = useMemo(() => {
    if (userRole === 'OWNER') return ROLE_OPTIONS
    return ROLE_OPTIONS.filter((role) => role !== 'OWNER')
  }, [userRole])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.name || ''} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  const roleCounts = useMemo(() => {
    return ROLE_OPTIONS.reduce((acc, role) => ({ ...acc, [role]: users.filter((user) => user.role === role).length }), {} as Record<Role, number>)
  }, [users])

  return (
    <div className='min-h-screen bg-gray-50 py-10'>
      <div className='max-w-7xl mx-auto px-6'>
        <div className='flex flex-col gap-6'>
          <div className='bg-white rounded-3xl shadow p-8'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-warm-600 font-semibold'>Administrator Control Center</p>
                <h1 className='text-3xl font-bold text-gray-900'>Platform Administration</h1>
                <p className='mt-2 text-sm text-gray-600 max-w-2xl'>Oversee users, review spa listings, and manage role-based access for the wider Booktrix platform.</p>
              </div>
              <div className='rounded-3xl border border-gray-200 bg-warm-50 px-4 py-3 text-sm text-warm-700'>Your role: {userRole}</div>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm'>
              <p className='text-sm text-gray-500'>Total users</p>
              <p className='mt-2 text-3xl font-semibold text-gray-900'>{users.length}</p>
            </div>
            <div className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm'>
              <p className='text-sm text-gray-500'>Tracked spas</p>
              <p className='mt-2 text-3xl font-semibold text-gray-900'>{spas.length}</p>
            </div>
            <div className='rounded-3xl border border-gray-200 bg-white p-5 shadow-sm'>
              <p className='text-sm text-gray-500'>Admin / owner access</p>
              <p className='mt-2 text-3xl font-semibold text-gray-900'>{roleCounts.ADMIN + roleCounts.OWNER}</p>
            </div>
          </div>

          <div className='grid gap-6 xl:grid-cols-[1.25fr_0.75fr]'>
            <div className='space-y-6'>
              <section className='bg-white rounded-3xl shadow p-6'>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6'>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900'>Global user oversight</h2>
                    <p className='text-sm text-gray-500'>Search and review all platform accounts from one place.</p>
                  </div>
                  <button onClick={resetForm} className='text-sm text-warm-600 hover:text-warm-700'>New user</button>
                </div>

                <div className='flex flex-col gap-3 md:flex-row md:items-center mb-6'>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search by name or email'
                    className='w-full md:max-w-xs rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
                    className='rounded-2xl border border-gray-200 px-4 py-3 focus:border-warm-400 focus:ring-warm-400'
                  >
                    <option value='ALL'>All roles</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className='py-16 text-center text-gray-500'>Loading users…</div>
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
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className='hover:bg-gray-50'>
                            <td className='px-4 py-4 text-gray-900'>{user.name || '—'}</td>
                            <td className='px-4 py-4 text-gray-600'>{user.email}</td>
                            <td className='px-4 py-4 text-gray-600'>{user.role}</td>
                            <td className='px-4 py-4 text-gray-500'>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className='px-4 py-4 text-sm text-gray-500 space-x-2'>
                              <button onClick={() => handleEdit(user)} className='rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-warm-400 hover:text-warm-600'>Edit</button>
                              <button onClick={() => handleDelete(user.id)} className='rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50'>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className='bg-white rounded-3xl shadow p-6'>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6'>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900'>Spa management controls</h2>
                    <p className='text-sm text-gray-500'>Review spa ownership, location details, and important operating metrics.</p>
                  </div>
                  <span className='rounded-full bg-warm-50 px-3 py-1 text-sm text-warm-700'>Admin oversight</span>
                </div>

                {spaLoading ? (
                  <div className='py-16 text-center text-gray-500'>Loading spas…</div>
                ) : spaError ? (
                  <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{spaError}</div>
                ) : (
                  <div className='grid gap-4'>
                    {spas.map((spa) => (
                      <div key={spa.id} className='rounded-2xl border border-gray-200 p-4'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                          <div>
                            <h3 className='font-semibold text-gray-900'>{spa.name}</h3>
                            <p className='text-sm text-gray-500'>Owner: {spa.owner?.name || spa.owner?.email || 'Unassigned'}</p>
                            <p className='text-sm text-gray-500'>Location: {spa.address || 'No address on file'}</p>
                          </div>
                          <Link href={`/s/${spa.slug}`} className='text-sm text-warm-600 hover:text-warm-700'>View spa</Link>
                        </div>
                        <div className='mt-4 grid gap-3 md:grid-cols-4'>
                          <div className='rounded-2xl bg-warm-50 p-3'>
                            <p className='text-xs uppercase tracking-wide text-gray-500'>Bookings</p>
                            <p className='text-lg font-semibold text-gray-900'>{spa.stats.bookings}</p>
                          </div>
                          <div className='rounded-2xl bg-warm-50 p-3'>
                            <p className='text-xs uppercase tracking-wide text-gray-500'>Reviews</p>
                            <p className='text-lg font-semibold text-gray-900'>{spa.stats.reviews}</p>
                          </div>
                          <div className='rounded-2xl bg-warm-50 p-3'>
                            <p className='text-xs uppercase tracking-wide text-gray-500'>Services</p>
                            <p className='text-lg font-semibold text-gray-900'>{spa.stats.services}</p>
                          </div>
                          <div className='rounded-2xl bg-warm-50 p-3'>
                            <p className='text-xs uppercase tracking-wide text-gray-500'>Employees</p>
                            <p className='text-lg font-semibold text-gray-900'>{spa.stats.employees}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className='space-y-6'>
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
                    <button type='submit' className='inline-flex items-center justify-center rounded-2xl bg-warm-600 px-4 py-3 text-sm font-semibold text-white hover:bg-warm-700 transition'>
                      {activeUserId ? 'Save changes' : 'Create user'}
                    </button>
                    {activeUserId && (
                      <button type='button' onClick={resetForm} className='text-sm text-gray-500 hover:text-gray-700'>Cancel edit</button>
                    )}
                  </div>
                </form>
              </div>

              <div className='bg-white rounded-3xl shadow p-6'>
                <div className='mb-6'>
                  <h2 className='text-xl font-semibold text-gray-900'>Role & permission management</h2>
                  <p className='text-sm text-gray-500'>Use the role presets below to keep access aligned with each team member’s responsibilities.</p>
                </div>
                <div className='space-y-3'>
                  {ROLE_ACCESS.map((access) => (
                    <div key={access.role} className='rounded-2xl border border-gray-200 bg-warm-50 p-4'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-semibold text-gray-900'>{access.title}</p>
                          <p className='text-sm text-gray-600'>{access.summary}</p>
                        </div>
                        <span className='rounded-full bg-white px-3 py-1 text-sm font-medium text-warm-700'>{access.role}</span>
                      </div>
                      <ul className='mt-3 list-disc pl-5 text-sm text-gray-600 space-y-1'>
                        {access.capabilities.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
