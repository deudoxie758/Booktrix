import { StaffScheduleEditor } from '@/components/business/StaffScheduleEditor'
import { TimeOffEditor } from '@/components/business/TimeOffEditor'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { saveStaffScheduleAction, saveTimeOffAction } from './actions'
export const dynamic='force-dynamic'
export default async function SchedulePage(){const context=await requireWorkspaceRole(['OWNER','MANAGER']);const members=await prisma.businessMembership.findMany({where:{businessId:context.business.id,active:true,role:{in:['OWNER','MANAGER','STAFF']}},include:{user:true}});const locations=context.availableLocations.map(({id,name})=>({id,name}));const staff=members.map(({id,user})=>({id,name:user.name??user.email??'Team member'}));return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Availability</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Staff schedules</h1><p className="mt-2 text-cocoa-600">Set recurring weekly hours and dated time-off exceptions by location.</p></header><StaffScheduleEditor locations={locations} staff={staff} action={saveStaffScheduleAction}/><TimeOffEditor locations={locations} staff={staff} action={saveTimeOffAction}/></div>}
