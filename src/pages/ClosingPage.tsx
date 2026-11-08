
import { useState } from 'react'

import { createClosing } from '../services/closingService'
import { calculateCashCount } from '../utils/cashCalculations'
import { calculateClosing } from '../utils/closingCalculations'
import { createId } from '../utils/createId'
import { formatCurrency } from '../utils/formatCurrency'
import {
  CASH_DENOMINATIONS,
  type CashDenomination,
} from '../types/cash'

import './ClosingPage.css'

function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function ClosingPage() {
  const [date, setDate] = useState(getToday())
  const [openingCash, setOpeningCash] = useState('0')
  const [entryAmount, setEntryAmount] = useState('0')
  const [withdrawalAmount, setWithdrawalAmount] = useState('0')

  const [quantities, setQuantities] = useState<
    Partial<Record<CashDenomination, number>>
  >({})

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cashCount = calculateCashCount(quantities)

  const safeOpeningCash = Number(openingCash)
  const safeEntryAmount = Number(entryAmount)
  const safeWithdrawalAmount = Number(withdrawalAmount)

  const extraordinaryEntries =
    safeEntryAmount > 0
      ? [
          {
            id: 'preview-entry',
            description: 'Entrada extraordinaria',
            amount: safeEntryAmount,
            date,
          },
        ]
      : []

  const extraordinaryWithdrawals =
    safeWithdrawalAmount > 0
      ? [
          {
            id: 'preview-withdrawal',
            description: 'Retiro extraordinario',
            amount: safeWithdrawalAmount,
            date,
          },
        ]
      : []

  const calculationIsValid =
    Number.isSafeInteger(safeOpeningCash) &&
    safeOpeningCash >= 0 &&
    Number.isSafeInteger(safeEntryAmount) &&
    safeEntryAmount >= 0 &&
    Number.isSafeInteger(safeWithdrawalAmount) &&
    safeWithdrawalAmount >= 0

  const result = calculationIsValid
    ? calculateClosing({
        openingCash: safeOpeningCash,
        finalCash: cashCount.totalAmount,
        cashExpenses: 0,
        extraordinaryEntries,
        extraordinaryWithdrawals,
      })
    : null

  function handleQuantityChange(
    denomination: CashDenomination,
    value: string,
  ) {
    if (value === '') {
      setQuantities((previous) => {
        const updated = { ...previous }
        delete updated[denomination]
        return updated
      })

      return
    }

    const quantity = Number(value)

    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      return
    }

    setQuantities((previous) => ({
      ...previous,
      [denomination]: quantity,
    }))
  }

  async function handleSave() {
    setError('')
    setMessage('')

    if (!date) {
      setError('Selecciona la fecha del cierre.')
      return
    }

    if (!calculationIsValid || !result) {
      setError(
        'Revisa los importes. Deben ser números enteros no negativos.',
      )
      return
    }

    setSaving(true)

    try {
      await createClosing({
        date,
        openingCash: safeOpeningCash,
        finalCash: cashCount.totalAmount,
        cashExpenses: 0,
        nonCashExpenses: 0,
        extraordinaryEntries: extraordinaryEntries.map((movement) => ({
          ...movement,
          id: createId(),
        })),
        extraordinaryWithdrawals: extraordinaryWithdrawals.map(
          (movement) => ({
            ...movement,
            id: createId(),
          }),
        ),
        cashCount,
      })

      setMessage('El cierre se guardó correctamente.')
      setQuantities({})
      setOpeningCash('0')
      setEntryAmount('0')
      setWithdrawalAmount('0')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el cierre.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="closing-page">
      <div className="closing-intro">
        <div>
          <p className="closing-eyebrow">GESTIÓN DIARIA</p>
          <h2>Nuevo cierre de caja</h2>
          <p>
            Registra el efectivo y calcula el resultado de la jornada.
          </p>
        </div>
      </div>

      <section className="closing-panel">
        <h3>1. Información del cierre</h3>

        <div className="closing-fields">
          <label>
            Fecha del cierre
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <label>
            Dinero inicial en caja
            <input
              type="number"
              min="0"
              step="1"
              value={openingCash}
              onChange={(event) => setOpeningCash(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="closing-panel">
        <div className="closing-section-heading">
          <div>
            <h3>2. Conteo del dinero final</h3>
            <p>Introduce la cantidad de cada billete y moneda.</p>
          </div>
          <strong>{formatCurrency(cashCount.totalAmount)}</strong>
        </div>

        <div className="closing-denominations">
          {CASH_DENOMINATIONS.map((denomination) => (
            <label
              className="closing-denomination"
              key={denomination}
            >
              <span>{formatCurrency(denomination)}</span>

              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={quantities[denomination] ?? ''}
                onChange={(event) =>
                  handleQuantityChange(
                    denomination,
                    event.target.value,
                  )
                }
              />

              <small>
                {formatCurrency(
                  denomination * (quantities[denomination] ?? 0),
                )}
              </small>
            </label>
          ))}
        </div>

        <div className="closing-cash-total">
          <span>Dinero final contado</span>
          <strong>{formatCurrency(cashCount.totalAmount)}</strong>
          <small>
            {cashCount.totalBills} billetes · {cashCount.totalCoins} monedas
          </small>
        </div>
      </section>

      <section className="closing-panel">
        <h3>3. Movimientos extraordinarios</h3>

        <p className="closing-help">
          Registra dinero que entró o salió por motivos diferentes a las ventas.
        </p>

        <div className="closing-fields">
          <label>
            Entradas extraordinarias
            <input
              type="number"
              min="0"
              step="1"
              value={entryAmount}
              onChange={(event) => setEntryAmount(event.target.value)}
            />
          </label>

          <label>
            Retiros extraordinarios
            <input
              type="number"
              min="0"
              step="1"
              value={withdrawalAmount}
              onChange={(event) =>
                setWithdrawalAmount(event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <section className="closing-results">
        <div>
          <p className="closing-eyebrow">RESULTADO DE LA JORNADA</p>
          <h3>Resumen del cierre</h3>
        </div>

        {result ? (
          <>
            <div className="closing-result-main">
              <span>Ingresos calculados</span>
              <strong>
                {formatCurrency(result.calculatedIncome)}
              </strong>
            </div>

            <div className="closing-share-grid">
              <div>
                <span>Participación personal · 15 %</span>
                <strong>
                  {formatCurrency(result.personalShare)}
                </strong>
              </div>

              <div>
                <span>Participación negocio · 85 %</span>
                <strong>
                  {formatCurrency(result.businessShare)}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <p className="closing-error">
            Revisa los importes para ver el resultado.
          </p>
        )}

        <p className="closing-disclaimer">
          La distribución es informativa. No descuenta dinero de la caja.
          Los gastos se registran por separado.
        </p>
      </section>

      {error && (
        <p className="closing-feedback error">{error}</p>
      )}

      {message && (
        <p className="closing-feedback success">{message}</p>
      )}

      <button
        type="button"
        className="closing-save-button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Guardando cierre...' : 'Guardar cierre'}
      </button>
    </div>
  )
}

export default ClosingPage
