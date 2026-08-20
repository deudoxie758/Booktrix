'use client'

import type { BusinessRole } from '@prisma/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { SignOutButton } from '@/components/auth/SignOutButton'
import type { WorkspaceNavItem } from './navigation'

type NavigationProps = { navigation: WorkspaceNavItem[]; role: BusinessRole }

function WorkspaceLinks({ navigation }: { navigation: WorkspaceNavItem[] }) {
  const pathname = usePathname()

  return <>{navigation.map((item) => {
    const current = item.href === '/business' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
    return <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined} className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm text-cream-100 hover:bg-white/10 hover:text-white">{item.label}</Link>
  })}</>
}

function WorkspaceUtilities() {
  return <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5">
    <Link href="/" className="rounded-full border border-white/25 px-3 py-2 text-sm font-semibold text-cream-50 hover:bg-white/10">View marketplace</Link>
    <Link href="/profile" className="rounded-full border border-white/25 px-3 py-2 text-sm font-semibold text-cream-50 hover:bg-white/10">My account</Link>
    <SignOutButton tone="account" />
  </div>
}

export function WorkspaceDesktopNavigation({ navigation, role }: NavigationProps) {
  return <>
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{role.toLowerCase()}</span>
    <nav aria-label="Business workspace" className="mt-6 flex flex-col gap-2">
      <WorkspaceLinks navigation={navigation} />
    </nav>
    <WorkspaceUtilities />
  </>
}

export function WorkspaceMobileNavigation({ navigation, role }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  return <div className="lg:hidden">
    <div className="flex items-center justify-between gap-3">
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{role.toLowerCase()}</span>
      <button type="button" aria-label={isOpen ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={isOpen} aria-controls="mobile-workspace-navigation" onClick={() => setIsOpen((open) => !open)} className="rounded-full border border-white/25 px-3 py-2 text-sm font-semibold text-cream-50 hover:bg-white/10">{isOpen ? 'Close' : 'Menu'}</button>
    </div>
    {isOpen ? <div id="mobile-workspace-navigation" className="mt-4 border-t border-white/15 pt-3">
      <nav aria-label="Mobile business workspace" className="flex flex-col gap-1">
        <WorkspaceLinks navigation={navigation} />
      </nav>
      <WorkspaceUtilities />
    </div> : null}
  </div>
}
