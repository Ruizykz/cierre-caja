
import { useEffect, useMemo, useState } from 'react'

import { getClosings } from '../services/closingService'
import type { CashClosing } from '../types/closing'
import { formatCurrency } from '../utils/formatCurrency'

import './StatisticsPage.css'

function StatisticsPage() {
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState(String(currentYear))
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getClosings()
        setClosings(data)
      } catch {
        setError('No se pudieron cargar las estadísticas.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const yearlyClosings = useMemo(
    () => closings.filter((closing) => closing.date.startsWith(`${year}-`)),
    [closings, year],
  )

  const totals = useMemo(() => {
    return yearlyClosings.reduce(
      (result, closing) => ({
        income: result.income + closing.calculatedIncome,
        cashExpenses: result.cashExpenses + closing.cashExpenses,
        nonCashExpenses:
          result.nonCashExpenses + closing.nonCashExpenses,
        personalShare: result.personalShare + closing.personalShare,
        businessShare: result.businessShare + closing.businessShare,
      }),
      {
        income: 0,
        cashExpenses: 0,
        nonCashExpenses: 0,
        personalShare: 0,
        businessShare: 0,
      },
    )
  }, [yearlyClosings])

  const averageIncome =
    yearlyClosings.length > 0
      ? Math.round(totals.income / yearlyClosings.length)
      : 0

  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')

    const monthClosings = yearlyClosings.filter((closing) =>
      closing.date.startsWith(`${year}-${month}`),
    )

    const income = monthClosings.reduce(
      (total, closing) => total + closing.calculatedIncome,
      0,
    )

    return {
      name: new Intl.DateTimeFormat('es-CO', {
        month: 'short',
      }).format(new Date(Number(year), index, 1)),
      income,
      count: monthClosings.length,
    }
  })

  const maxIncome = Math.max(
    1,
    ...monthlyData.map((month) => Math.abs(month.income)),
  )

  const bestClosing = [...yearlyClosings].sort(
    (a, b) => b.calculatedIncome - a.calculatedIncome,
  )[0]

  const years = Array.from(
    { length: 7 },
    (_, index) => currentYear - index,
  )

  return (
    <div className="statistics-page">
      <div className="statistics-intro">
        <div>
          <p className="statistics-eyebrow">ANÁLISIS DEL NEGOCIO</p>
          <h2>Estadísticas</h2>
          <p>Consulta el comportamiento financiero de tus cierres.</p>
        </div>

        <label className="statistics-year-select">
          Año de consulta
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {years.map((item) => (
              <option key={item} value={String(item)}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <section className="statistics-panel">
          <p>Cargando estadísticas...</p>
        </section>
      ) : error ? (
        <p className="statistics-error">{error}</p>
      ) : (
        <>
          <div className="statistics-summary">
            <div className="statistics-card main-stat">
              <span>Ingresos calculados del año</span>
              <strong>{formatCurrency(totals.income)}</strong>
              <small>{yearlyClosings.length} cierres registrados</small>
            </div>

            <div className="statistics-card">
              <span>Promedio por cierre</span>
              <strong>{formatCurrency(averageIncome)}</strong>
              <small>Ingresos promedio registrados</small>
            </div>

            <div className="statistics-card">
              <span>Gastos totales</span>
              <strong>
                {formatCurrency(
                  totals.cashExpenses + totals.nonCashExpenses,
                )}
              </strong>
              <small>Todos los métodos de pago</small>
            </div>

            <div className="statistics-card">
              <span>Participación personal</span>
              <strong>{formatCurrency(totals.personalShare)}</strong>
              <small>Distribución acumulada del 15 %</small>
            </div>
          </div>

          <section className="statistics-panel">
            <div className="statistics-panel-heading">
              <div>
                <h3>Ingresos por mes</h3>
                <p>Resultado acumulado de cada mes del año {year}.</p>
              </div>
            </div>

            <div className="statistics-chart">
              {monthlyData.map((month) => {
                const width =
                  month.income === 0
                    ? 0
                    : Math.max(
                        2,
                        (Math.abs(month.income) / maxIncome) * 100,
                      )

                return (
                  <div className="statistics-bar-row" key={month.name}>
                    <span className="statistics-month">
                      {month.name}
                    </span>

                    <div className="statistics-bar-track">
                      <div
                        className={[
                          'statistics-bar',
                          month.income < 0 ? 'negative' : '',
                        ].join(' ')}
                        style={{ width: `${width}%` }}
                      />
                    </div>

                    <div className="statistics-bar-value">
                      <strong>{formatCurrency(month.income)}</strong>
                      <small>{month.count} cierres</small>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="statistics-bottom-grid">
            <section className="statistics-panel">
              <h3>Distribución del resultado</h3>

              <div className="statistics-distribution">
                <div>
                  <span>Personal · 15 %</span>
                  <strong>{formatCurrency(totals.personalShare)}</strong>
                </div>

                <div>
                  <span>Negocio · 85 %</span>
                  <strong>{formatCurrency(totals.businessShare)}</strong>
                </div>
              </div>

              <div className="statistics-share-track">
                <div />
              </div>

              <p className="statistics-note">
                La distribución es informativa y no representa retiros
                físicos de dinero.
              </p>
            </section>

            <section className="statistics-panel">
              <h3>Resumen de gastos</h3>

              <div className="statistics-expense-row">
                <span>Pagados en efectivo</span>
                <strong>{formatCurrency(totals.cashExpenses)}</strong>
              </div>

              <div className="statistics-expense-row">
                <span>Otros métodos de pago</span>
                <strong>{formatCurrency(totals.nonCashExpenses)}</strong>
              </div>

              <div className="statistics-expense-row total">
                <span>Total de gastos</span>
                <strong>
                  {formatCurrency(
                    totals.cashExpenses + totals.nonCashExpenses,
                  )}
                </strong>
              </div>
            </section>
          </div>

          <section className="statistics-panel">
            <h3>Mejor resultado registrado</h3>

            {bestClosing ? (
              <div className="statistics-best-closing">
                <div>
                  <span>Fecha del cierre</span>
                  <strong>{bestClosing.date}</strong>
                </div>

                <div>
                  <span>Ingresos calculados</span>
                  <strong>
                    {formatCurrency(bestClosing.calculatedIncome)}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="statistics-note">
                No hay cierres registrados durante {year}.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default StatisticsPage
