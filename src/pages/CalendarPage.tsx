
import { useEffect, useState } from 'react'

import { getClosings } from '../services/closingService'
import type { CashClosing } from '../types/closing'
import { formatCurrency } from '../utils/formatCurrency'

import './CalendarPage.css'

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function CalendarPage() {
  const today = new Date()

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString(today),
  )

  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getClosings()
        setClosings(data)
      } catch {
        setError('No se pudieron cargar los cierres.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const monthName = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(currentMonth)

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const startingDay = (firstDay.getDay() + 6) % 7

  const calendarCells: (number | null)[] = [
    ...Array.from({ length: startingDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null)
  }

  const closingByDate = new Map(
    closings.map((closing) => [closing.date, closing]),
  )

  const selectedClosing = closingByDate.get(selectedDate)

  const monthClosings = closings.filter((closing) => {
    return closing.date.startsWith(
      `${year}-${String(month + 1).padStart(2, '0')}`,
    )
  })

  const monthIncome = monthClosings.reduce(
    (total, closing) => total + closing.calculatedIncome,
    0,
  )

  function changeMonth(amount: number) {
    setCurrentMonth(
      new Date(year, month + amount, 1),
    )
  }

  function selectDay(day: number) {
    const dateString = getLocalDateString(
      new Date(year, month, day),
    )

    setSelectedDate(dateString)
  }

  return (
    <div className="calendar-page">
      <div className="calendar-intro">
        <div>
          <p className="calendar-eyebrow">ORGANIZACIÓN DIARIA</p>
          <h2>Calendario de cierres</h2>
          <p>Consulta los días en los que registraste actividad.</p>
        </div>
      </div>

      <div className="calendar-summary">
        <div>
          <span>Cierres del mes</span>
          <strong>{monthClosings.length}</strong>
        </div>

        <div>
          <span>Ingresos calculados del mes</span>
          <strong>{formatCurrency(monthIncome)}</strong>
        </div>
      </div>

      <section className="calendar-panel">
        <div className="calendar-navigation">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Mes anterior"
          >
            ‹
          </button>

          <h3>{monthName}</h3>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(
            (day) => (
              <div className="calendar-weekday" key={day}>
                {day}
              </div>
            ),
          )}

          {calendarCells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  className="calendar-empty-day"
                  key={`empty-${index}`}
                />
              )
            }

            const dateString = getLocalDateString(
              new Date(year, month, day),
            )

            const hasClosing = closingByDate.has(dateString)
            const isSelected = selectedDate === dateString
            const isToday = dateString === getLocalDateString(today)

            return (
              <button
                type="button"
                key={dateString}
                className={[
                  'calendar-day',
                  hasClosing ? 'has-closing' : '',
                  isSelected ? 'selected' : '',
                  isToday ? 'today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectDay(day)}
              >
                <span>{day}</span>
                {hasClosing && <i />}
              </button>
            )
          })}
        </div>

        <div className="calendar-legend">
          <span><i /> Día con cierre registrado</span>
          <span><i /> Día seleccionado</span>
        </div>
      </section>

      <section className="calendar-selected">
        <p className="calendar-eyebrow">DÍA SELECCIONADO</p>
        <h3>{selectedDate}</h3>

        {loading ? (
          <p>Cargando información...</p>
        ) : error ? (
          <p className="calendar-error">{error}</p>
        ) : selectedClosing ? (
          <div className="calendar-closing-details">
            <div>
              <span>Dinero inicial</span>
              <strong>{formatCurrency(selectedClosing.openingCash)}</strong>
            </div>

            <div>
              <span>Dinero final</span>
              <strong>{formatCurrency(selectedClosing.finalCash)}</strong>
            </div>

            <div>
              <span>Ingresos calculados</span>
              <strong>{formatCurrency(selectedClosing.calculatedIncome)}</strong>
            </div>

            <div>
              <span>Gastos en efectivo</span>
              <strong>{formatCurrency(selectedClosing.cashExpenses)}</strong>
            </div>

            <div>
              <span>Participación personal</span>
              <strong>{formatCurrency(selectedClosing.personalShare)}</strong>
            </div>

            <div>
              <span>Participación del negocio</span>
              <strong>{formatCurrency(selectedClosing.businessShare)}</strong>
            </div>
          </div>
        ) : (
          <p className="calendar-no-closing">
            No hay ningún cierre registrado para este día.
          </p>
        )}
      </section>
    </div>
  )
}

export default CalendarPage
