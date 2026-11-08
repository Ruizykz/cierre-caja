
import { useEffect, useMemo, useState } from 'react'

import {
  deleteClosing,
  getClosings,
} from '../services/closingService'

import { getExpensesByClosing } from '../services/expenseService'

import type { CashClosing } from '../types/closing'
import type { Expense } from '../types/expense'

import { formatCurrency } from '../utils/formatCurrency'

import './HistoryPage.css'

function HistoryPage() {
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [selectedClosing, setSelectedClosing] =
    useState<CashClosing | null>(null)

  const [selectedExpenses, setSelectedExpenses] =
    useState<Expense[]>([])

  const [searchDate, setSearchDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState('')

  async function loadClosings() {
    setLoading(true)
    setError('')

    try {
      const data = await getClosings()
      setClosings(data)
    } catch {
      setError('No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClosings()
  }, [])

  const filteredClosings = useMemo(() => {
    return closings.filter((closing) =>
      closing.date.includes(searchDate),
    )
  }, [closings, searchDate])

  async function handleViewDetails(closing: CashClosing) {
    setSelectedClosing(closing)
    setSelectedExpenses([])
    setLoadingDetails(true)
    setError('')

    try {
      const expenses = await getExpensesByClosing(closing.id)
      setSelectedExpenses(expenses)
    } catch {
      setError('No se pudieron cargar los gastos de este cierre.')
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleDelete(closing: CashClosing) {
    const confirmed = window.confirm(
      `¿Eliminar el cierre del ${closing.date} y todos sus gastos asociados? Esta acción no se puede deshacer.`,
    )

    if (!confirmed) return

    setError('')

    try {
      await deleteClosing(closing.id)

      if (selectedClosing?.id === closing.id) {
        setSelectedClosing(null)
        setSelectedExpenses([])
      }

      await loadClosings()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el cierre.',
      )
    }
  }

  function closeDetails() {
    setSelectedClosing(null)
    setSelectedExpenses([])
  }

  const totalIncome = filteredClosings.reduce(
    (total, closing) => total + closing.calculatedIncome,
    0,
  )

  return (
    <div className="history-page">
      <div className="history-intro">
        <div>
          <p className="history-eyebrow">REGISTROS DEL NEGOCIO</p>
          <h2>Historial de cierres</h2>
          <p>
            Consulta los resultados y movimientos de tus jornadas.
          </p>
        </div>
      </div>

      <div className="history-summary">
        <div className="history-summary-card">
          <span>Cierres encontrados</span>
          <strong>{filteredClosings.length}</strong>
        </div>

        <div className="history-summary-card">
          <span>Ingresos acumulados</span>
          <strong>{formatCurrency(totalIncome)}</strong>
        </div>
      </div>

      <section className="history-panel">
        <div className="history-toolbar">
          <div>
            <h3>Todos los cierres</h3>
            <p>Los registros aparecen ordenados por fecha.</p>
          </div>

          <label className="history-search">
            Buscar por fecha
            <input
              type="date"
              value={searchDate}
              onChange={(event) => setSearchDate(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <p className="history-empty">Cargando historial...</p>
        ) : filteredClosings.length === 0 ? (
          <p className="history-empty">
            {searchDate
              ? 'No hay cierres registrados para esa fecha.'
              : 'Todavía no hay cierres guardados.'}
          </p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Dinero inicial</th>
                  <th>Dinero final</th>
                  <th>Ingresos calculados</th>
                  <th>15 % personal</th>
                  <th>85 % negocio</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredClosings.map((closing) => (
                  <tr key={closing.id}>
                    <td>
                      <strong>{closing.date}</strong>
                    </td>
                    <td>{formatCurrency(closing.openingCash)}</td>
                    <td>{formatCurrency(closing.finalCash)}</td>
                    <td className="history-income">
                      {formatCurrency(closing.calculatedIncome)}
                    </td>
                    <td>{formatCurrency(closing.personalShare)}</td>
                    <td>{formatCurrency(closing.businessShare)}</td>
                    <td>
                      <div className="history-actions">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(closing)}
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          className="history-delete"
                          onClick={() => handleDelete(closing)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && (
        <p className="history-error">{error}</p>
      )}

      {selectedClosing && (
        <section className="history-detail">
          <div className="history-detail-heading">
            <div>
              <p className="history-eyebrow">DETALLE DEL REGISTRO</p>
              <h3>Cierre del {selectedClosing.date}</h3>
            </div>

            <button
              type="button"
              onClick={closeDetails}
              className="history-close-button"
            >
              Cerrar detalle
            </button>
          </div>

          <div className="history-detail-grid">
            <div>
              <span>Dinero inicial</span>
              <strong>
                {formatCurrency(selectedClosing.openingCash)}
              </strong>
            </div>

            <div>
              <span>Dinero final</span>
              <strong>
                {formatCurrency(selectedClosing.finalCash)}
              </strong>
            </div>

            <div>
              <span>Gastos en efectivo</span>
              <strong>
                {formatCurrency(selectedClosing.cashExpenses)}
              </strong>
            </div>

            <div>
              <span>Gastos no efectivos</span>
              <strong>
                {formatCurrency(selectedClosing.nonCashExpenses)}
              </strong>
            </div>

            <div>
              <span>Ingresos calculados</span>
              <strong>
                {formatCurrency(selectedClosing.calculatedIncome)}
              </strong>
            </div>

            <div>
              <span>Distribución personal · 15 %</span>
              <strong>
                {formatCurrency(selectedClosing.personalShare)}
              </strong>
            </div>

            <div>
              <span>Distribución negocio · 85 %</span>
              <strong>
                {formatCurrency(selectedClosing.businessShare)}
              </strong>
            </div>
          </div>

          <div className="history-detail-section">
            <h4>Conteo de efectivo</h4>

            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Denominación</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedClosing.cashCount.items
                    .filter((item) => item.quantity > 0)
                    .map((item) => (
                      <tr key={item.denomination}>
                        <td>{formatCurrency(item.denomination)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p className="history-detail-total">
              Total contado: {formatCurrency(selectedClosing.cashCount.totalAmount)}
            </p>
          </div>

          <div className="history-detail-section">
            <h4>Movimientos extraordinarios</h4>

            <div className="history-movements">
              <div>
                <strong>Entradas</strong>

                {selectedClosing.extraordinaryEntries.length === 0 ? (
                  <p>Sin entradas extraordinarias.</p>
                ) : (
                  selectedClosing.extraordinaryEntries.map((movement) => (
                    <p key={movement.id}>
                      {movement.description} · {formatCurrency(movement.amount)}
                    </p>
                  ))
                )}
              </div>

              <div>
                <strong>Retiros</strong>

                {selectedClosing.extraordinaryWithdrawals.length === 0 ? (
                  <p>Sin retiros extraordinarios.</p>
                ) : (
                  selectedClosing.extraordinaryWithdrawals.map((movement) => (
                    <p key={movement.id}>
                      {movement.description} · {formatCurrency(movement.amount)}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="history-detail-section">
            <h4>Gastos asociados</h4>

            {loadingDetails ? (
              <p>Cargando gastos...</p>
            ) : selectedExpenses.length === 0 ? (
              <p>No hay gastos asociados a este cierre.</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Método de pago</th>
                      <th>Importe</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.description}</td>
                        <td>{expense.date}</td>
                        <td>{expense.category}</td>
                        <td>
                          {{
                            cash: 'Efectivo',
                            transfer: 'Transferencia',
                            card: 'Tarjeta',
                            other: 'Otro',
                          }[expense.paymentMethod]}
                        </td>
                        <td>{formatCurrency(expense.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default HistoryPage
