import type { ReactNode } from 'react'

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <section className="panel empty-state"><h2>{title}</h2><p>{description}</p>{children}</section>
}
