
import { useEffect, useMemo, useState } from 'react'

import type { AuditLog } from '../types/audit'
import { getAuditLogs } from '../services/auditService'

import './AuditPage.css'

type EntityFilter = 'all' | 'closing' | 'expense'
type ActionFilter = 'all' | 'create' | 'update' | 'delete' | 'import'

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActionLabel(action: AuditLog['action']): string {
  const labels: Record<AuditLog['action'], string> = {
    create: 'Creación',
    update: 'Modificación',
    delete: 'Eliminación',
    import: 'Importación',
  }

  return labels[action]
}

function getEntityLabel(entity: AuditLog['entityType']): string {
  return entity === 'closing' ? 'Cierre' : 'Gasto'
}

function formatDetails(value: unknown): string {
  if (value === undefined) {
    return 'No hay información disponible.'
  }

  return JSON.stringify(
    value,
    (_key, item) => {
      if (
        typeof item === 'number' &&
        Number.isSafeInteger(item) &&
        item >= 100
      ) {
        return item
      }

      return item
    },
    2,
  ) ?? 'No hay información disponible.'
}

function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [entityFilter, setEntityFilter] =
    useState<EntityFilter>('all')
  const [actionFilter, setActionFilter] =
    useState<ActionFilter>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    try {
      setLoading(true)
      setError('')

      const result = await getAuditLogs()
      setLogs(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la auditoría.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesEntity =
        entityFilter === 'all' ||
        log.entityType === entityFilter

      const matchesAction =
        actionFilter === 'all' ||
        log.action === actionFilter

      const matchesDate =
        !dateFilter || log.date.startsWith(dateFilter)

      const matchesSearch =
        !normalizedSearch ||
        log.description.toLowerCase().includes(normalizedSearch) ||
        log.entityId.toLowerCase().includes(normalizedSearch)

      return (
        matchesEntity &&
        matchesAction &&
        matchesDate &&
        matchesSearch
      )
    })
  }, [logs, entityFilter, actionFilter, dateFilter, search])

  return (
    <div className="audit-page">
      <section className="audit-summary">
        <div>
          <span className="audit-label">CONTROL DE ACTIVIDAD</span>
          <h2>Registro de auditoría</h2>
          <p>
            Consulta las operaciones realizadas sobre los cierres
            y los gastos de tu negocio.
          </p>
        </div>

        <div className="audit-total">
          <strong>{logs.length}</strong>
          <span>Movimientos registrados</span>
        </div>
      </section>

      <section className="audit-filters">
        <div className="audit-filter">
          <label htmlFor="audit-search">Buscar</label>
          <input
            id="audit-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Descripción o identificador..."
          />
        </div>

        <div className="audit-filter">
          <label htmlFor="audit-entity">Tipo de registro</label>
          <select
            id="audit-entity"
            value={entityFilter}
            onChange={(event) =>
              setEntityFilter(event.target.value as EntityFilter)
            }
          >
            <option value="all">Todos</option>
            <option value="closing">Cierres</option>
            <option value="expense">Gastos</option>
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="audit-action">Acción</label>
          <select
            id="audit-action"
            value={actionFilter}
            onChange={(event) =>
              setActionFilter(event.target.value as ActionFilter)
            }
          >
            <option value="all">Todas</option>
            <option value="create">Creaciones</option>
            <option value="update">Modificaciones</option>
            <option value="delete">Eliminaciones</option>
            <option value="import">Importaciones</option>
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="audit-date">Fecha</label>
          <input
            id="audit-date"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="audit-clear-button"
          onClick={() => {
            setEntityFilter('all')
            setActionFilter('all')
            setDateFilter('')
            setSearch('')
          }}
        >
          Limpiar filtros
        </button>
      </section>

      {loading && (
        <p className="audit-status">Cargando movimientos...</p>
      )}

      {error && (
        <div className="audit-error" role="alert">
          {error}
          <button type="button" onClick={() => void loadLogs()}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && filteredLogs.length === 0 && (
        <div className="audit-empty">
          <h3>No hay movimientos para mostrar</h3>
          <p>
            Prueba cambiando los filtros o registra una operación
            en cierres o gastos.
          </p>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <section className="audit-list">
          <div className="audit-list-heading">
            <h3>Actividad registrada</h3>
            <span>{filteredLogs.length} resultado(s)</span>
          </div>

          {filteredLogs.map((log) => (
            <article className="audit-item" key={log.id}>
              <div className="audit-item-top">
                <div className="audit-item-tags">
                  <span className={`audit-tag audit-${log.action}`}>
                    {getActionLabel(log.action)}
                  </span>
                  <span className="audit-tag audit-entity">
                    {getEntityLabel(log.entityType)}
                  </span>
                </div>

                <time>{formatDate(log.date)}</time>
              </div>

              <p className="audit-description">{log.description}</p>

              <p className="audit-id">
                Identificador: {log.entityId}
              </p>

              {(log.before !== undefined ||
                log.after !== undefined) && (
                <details className="audit-details">
                  <summary>Consultar detalles del movimiento</summary>

                  {log.before !== undefined && (
                    <div className="audit-detail-block">
                      <h4>Datos anteriores</h4>
                      <pre>{formatDetails(log.before)}</pre>
                    </div>
                  )}

                  {log.after !== undefined && (
                    <div className="audit-detail-block">
                      <h4>Datos nuevos</h4>
                      <pre>{formatDetails(log.after)}</pre>
                    </div>
                  )}
                </details>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default AuditPage
