import { Card } from '@/components/ui/Card'
export function WorkspacePlaceholder({ title, description }: { title: string; description: string }) { return <Card className="p-7"><h2 className="font-display text-3xl">{title}</h2><p className="mt-3 max-w-2xl text-cocoa-600">{description}</p></Card> }
