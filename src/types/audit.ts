
export type AuditEntityType = 'closing' | 'expense'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'import'

export interface AuditLog {
  id: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  description: string
  date: string
  before?: unknown
  after?: unknown
}
