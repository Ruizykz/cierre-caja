import { useEffect, useState } from 'react'
import { db } from '../database/db'
import type { CashClosing } from '../types/closing'
import type { Expense } from '../types/expense'
import { formatCurrency } from '../utils/formatCurrency'
import './DashboardPage.css'

interface DashboardPageProps {
  onNavigate: (section: string) => void
}

interface DashboardData {
  closings: CashClosing[]
  expenses: Expense[]
}

function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData>({
    closings: [],
    expenses: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const [closings, expenses] = await Promise.all([
          db.closings.toArray(),
          db.expenses.toArray(),
        ])

        closings.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date)
          }

          return b.createdAt.localeCompare(a.createdAt)
        })

        if (active) {
          setData({ closings, expenses })
          setError('')
        }
      } catch {
        if (active) {
          setError('No se pudieron cargar los datos del panel.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const today = getToday()

  const todayClosings = data.closings.filter(
    (closing) => closing.date === today,
  )

  const todayExpenses = data.expenses.filter(
    (expense) => expense.date === today,
  )

  const todayIncome = todayClosings.reduce(
    (total, closing) => total + closing.calculatedIncome,
    0,
  )

  const personalShare = todayClosings.reduce(
    (total, closing) => total + closing.personalShare,
    0,
  )

  const businessShare = todayClosings.reduce(
    (total, closing) => total + closing.businessShare,
    0,
  )

  const cashExpenses = todayExpenses
    .filter((expense) => expense.paymentMethod === 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  const nonCashExpenses = todayExpenses
    .filter((expense) => expense.paymentMethod !== 'cash')
    .reduce((total, expense) => total + expense.amount, 0)

  const recentClosings = data.closings.slice(0, 5)

  if (loading) {
    return (
      <div className="dashboard-message">
        Cargando información del negocio...
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-message dashboard-error">
        {error}
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">RESUMEN GENERAL</p>
          <h2>Panel de control</h2>
          <p>
            Consulta el estado de tu caja y la actividad de tu negocio.
          </p>
        </div>

        <div className="dashboard-date">
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Resumen de hoy</h3>
            <p>Información registrada durante el día actual.</p>
          </div>
        </div>

        <div className="dashboard-stats">
          <article className="dashboard-card">
            <span className="dashboard-card-label">
              Ingresos calculados
            </span>
            <strong>{formatCurrency(todayIncome)}</strong>
            <span className="dashboard-card-detail">
              Según los cierres de hoy
            </span>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">
              Gastos en efectivo
            </span>
            <strong>{formatCurrency(cashExpenses)}</strong>
            <span className="dashboard-card-detail">
              Registrados hoy
            </span>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">
              Gastos no efectivos
            </span>
            <strong>{formatCurrency(nonCashExpenses)}</strong>
            <span className="dashboard-card-detail">
              Transferencias, tarjetas y otros
            </span>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">
              Cierres realizados
            </span>
            <strong>{todayClosings.length}</strong>
            <span className="dashboard-card-detail">
              Durante el día de hoy
            </span>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Distribución de ingresos</h3>
            <p>Repartición informativa del ingreso calculado hoy.</p>
          </div>
        </div>

        <div className="dashboard-distribution">
          <article className="distribution-card">
            <span>Participación personal · 15 %</span>
            <strong>{formatCurrency(personalShare)}</strong>
          </article>

          <article className="distribution-card">
            <span>Participación del negocio · 85 %</span>
            <strong>{formatCurrency(businessShare)}</strong>
          </article>
        </div>

        <p className="dashboard-note">
          Estos valores son informativos. No representan retiros
          automáticos de dinero de la caja.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Actividad reciente</h3>
            <p>Los últimos cinco cierres registrados.</p>
          </div>

          <button
            className="dashboard-text-button"
            onClick={() => onNavigate('historial')}
          >
            Ver historial
          </button>
        </div>

        {recentClosings.length === 0 ? (
          <div className="dashboard-empty">
            <h4>Aún no hay cierres registrados</h4>
            <p>
              Cuando realices tu primer cierre, aparecerá aquí.
            </p>
            <button
              className="dashboard-primary-button"
              onClick={() => onNavigate('cierre')}
            >
              Crear primer cierre
            </button>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Dinero inicial</th>
                  <th>Dinero final</th>
                  <th>Ingreso calculado</th>
                </tr>
              </thead>

              <tbody>
                {recentClosings.map((closing) => (
                  <tr key={closing.id}>
                    <td>{formatDate(closing.date)}</td>
                    <td>{formatCurrency(closing.openingCash)}</td>
                    <td>{formatCurrency(closing.finalCash)}</td>
                    <td className="dashboard-income">
                      {formatCurrency(closing.calculatedIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h3>Accesos rápidos</h3>
            <p>Entra directamente a las funciones principales.</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <button
            className="dashboard-action"
            onClick={() => onNavigate('cierre')}
          >
            <strong>Nuevo cierre</strong>
            <span>Registrar el cierre de caja</span>
          </button>

          <button
            className="dashboard-action"
            onClick={() => onNavigate('gastos')}
          >
            <strong>Registrar gastos</strong>
            <span>Consultar o añadir gastos</span>
          </button>

          <button
            className="dashboard-action"
            onClick={() => onNavigate('estadisticas')}
          >
            <strong>Estadísticas</strong>
            <span>Revisar resultados y tendencias</span>
          </button>

          <button
            className="dashboard-action"
            onClick={() => onNavigate('copias')}
          >
            <strong>Copias de seguridad</strong>
            <span>Proteger tus registros</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage