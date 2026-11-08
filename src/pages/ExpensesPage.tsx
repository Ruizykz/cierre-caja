
import { useEffect, useState } from 'react'

import { getClosings } from '../services/closingService'
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from '../services/expenseService'

import type { Expense, PaymentMethod } from '../types/expense'
import type { CashClosing } from '../types/closing'

import { formatCurrency } from '../utils/formatCurrency'

import './ExpensesPage.css'

function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [closings, setClosings] = useState<CashClosing[]>([])

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getToday())
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cash')
  const [category, setCategory] = useState('')
  const [observations, setObservations] = useState('')
  const [closingId, setClosingId] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [savedExpenses, savedClosings] = await Promise.all([
        getExpenses(),
        getClosings(),
      ])

      setExpenses(savedExpenses)
      setClosings(savedClosings)

      if (!closingId && savedClosings.length > 0) {
        setClosingId(savedClosings[0].id)
      }
    } catch {
      setError('No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setDescription('')
    setAmount('')
    setDate(getToday())
    setPaymentMethod('cash')
    setCategory('')
    setObservations('')
    setEditingId(null)
  }

  function handleEdit(expense: Expense) {
    setDescription(expense.description)
    setAmount(String(expense.amount))
    setDate(expense.date)
    setPaymentMethod(expense.paymentMethod)
    setCategory(expense.category)
    setObservations(expense.observations ?? '')
    setClosingId(expense.closingId)
    setEditingId(expense.id)
    setError('')
    setMessage('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setMessage('')

    const numericAmount = Number(amount)

    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
      setError('El importe debe ser un número entero mayor que cero.')
      return
    }

    if (!closingId) {
      setError('Primero debes crear un cierre de caja.')
      return
    }

    setSaving(true)

    try {
      const expenseData = {
        closingId,
        description,
        amount: numericAmount,
        date,
        paymentMethod,
        category,
        observations,
      }

      if (editingId) {
        await updateExpense(editingId, expenseData)
        setMessage('El gasto se actualizó correctamente.')
      } else {
        await createExpense(expenseData)
        setMessage('El gasto se registró correctamente.')
      }

      resetForm()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el gasto.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este gasto?',
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await deleteExpense(id)

      if (editingId === id) {
        resetForm()
      }

      setMessage('El gasto se eliminó correctamente.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el gasto.',
      )
    }
  }

  const totalCash = expenses
    .filter((expense) => expense.paymentMethod === 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  const totalNonCash = expenses
    .filter((expense) => expense.paymentMethod !== 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  function getPaymentLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      card: 'Tarjeta',
      other: 'Otro',
    }

    return labels[method]
  }

  return (
    <div className="expenses-page">
      <div className="expenses-intro">
        <div>
          <p className="expenses-eyebrow">CONTROL DE EGRESOS</p>
          <h2>Gestión de gastos</h2>
          <p>
            Registra y consulta los gastos relacionados con cada cierre.
          </p>
        </div>
      </div>

      <div className="expenses-summary">
        <div className="expense-summary-card">
          <span>Gastos en efectivo</span>
          <strong>{formatCurrency(totalCash)}</strong>
          <small>Afectan el cálculo de ingresos</small>
        </div>

        <div className="expense-summary-card">
          <span>Gastos no efectivos</span>
          <strong>{formatCurrency(totalNonCash)}</strong>
          <small>Transferencias, tarjetas y otros</small>
        </div>

        <div className="expense-summary-card">
          <span>Total de gastos</span>
          <strong>{formatCurrency(totalCash + totalNonCash)}</strong>
          <small>{expenses.length} registros</small>
        </div>
      </div>

      <section className="expenses-panel">
        <div className="expenses-panel-heading">
          <div>
            <h3>{editingId ? 'Editar gasto' : 'Registrar nuevo gasto'}</h3>
            <p>Completa la información del gasto.</p>
          </div>
        </div>

        {closings.length === 0 ? (
          <p className="expenses-empty">
            Todavía no hay cierres registrados. Crea primero un cierre
            para poder asociarle gastos.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="expenses-form-grid">
              <label>
                Descripción
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ej. Compra de materiales"
                  required
                />
              </label>

              <label>
                Importe en pesos
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Ej. 25000"
                  required
                />
              </label>

              <label>
                Fecha del gasto
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>

              <label>
                Método de pago
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="other">Otro</option>
                </select>
              </label>

              <label>
                Categoría
                <input
                  type="text"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Ej. Servicios, compras..."
                  required
                />
              </label>

              <label>
                Cierre relacionado
                <select
                  value={closingId}
                  onChange={(event) => setClosingId(event.target.value)}
                  required
                >
                  {closings.map((closing) => (
                    <option key={closing.id} value={closing.id}>
                      {closing.date}
                    </option>
                  ))}
                </select>
              </label>

              <label className="expense-observations">
                Observaciones (opcional)
                <textarea
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  placeholder="Información adicional..."
                  rows={3}
                />
              </label>
            </div>

            <div className="expenses-form-actions">
              {editingId && (
                <button
                  type="button"
                  className="expense-cancel-button"
                  onClick={resetForm}
                >
                  Cancelar edición
                </button>
              )}

              <button
                type="submit"
                className="expense-save-button"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : editingId
                    ? 'Actualizar gasto'
                    : 'Guardar gasto'}
              </button>
            </div>
          </form>
        )}
      </section>

      {error && <p className="expense-feedback error">{error}</p>}
      {message && <p className="expense-feedback success">{message}</p>}

      <section className="expenses-panel">
        <div className="expenses-panel-heading">
          <div>
            <h3>Gastos registrados</h3>
            <p>Consulta, modifica o elimina tus registros.</p>
          </div>
          <span className="expenses-count">{expenses.length} gastos</span>
        </div>

        {loading ? (
          <p className="expenses-empty">Cargando gastos...</p>
        ) : expenses.length === 0 ? (
          <p className="expenses-empty">
            Todavía no has registrado ningún gasto.
          </p>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Pago</th>
                  <th>Importe</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.description}</strong>
                      {expense.observations && (
                        <small>{expense.observations}</small>
                      )}
                    </td>
                    <td>{expense.date}</td>
                    <td>{expense.category}</td>
                    <td>{getPaymentLabel(expense.paymentMethod)}</td>
                    <td className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td>
                      <div className="expense-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(expense)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={() => handleDelete(expense.id)}
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
    </div>
  )
}

export default ExpensesPage
