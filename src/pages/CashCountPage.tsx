
import { useMemo, useState } from 'react'

import {
  CASH_DENOMINATIONS,
  type CashDenomination,
} from '../types/cash'

import { calculateCashCount } from '../utils/cashCalculations'
import { formatCurrency } from '../utils/formatCurrency'

import './CashCountPage.css'

function CashCountPage() {
  const [quantities, setQuantities] = useState<
    Partial<Record<CashDenomination, number>>
  >({})

  const cashCount = useMemo(
    () => calculateCashCount(quantities),
    [quantities],
  )

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

  function handleClear() {
    setQuantities({})
  }

  return (
    <div className="cash-page">
      <div className="cash-page-intro">
        <div>
          <p className="cash-eyebrow">CONTROL DE EFECTIVO</p>
          <h2>Conteo de efectivo</h2>
          <p className="cash-description">
            Introduce la cantidad de billetes y monedas
            disponibles en la caja.
          </p>
        </div>

        <button
          type="button"
          className="cash-clear-button"
          onClick={handleClear}
        >
          Limpiar conteo
        </button>
      </div>

      <div className="cash-content-grid">
        <section className="cash-table-card">
          <div className="cash-card-heading">
            <div>
              <h3>Denominaciones</h3>
              <p>Pesos colombianos (COP)</p>
            </div>
            <span className="cash-count-badge">
              {CASH_DENOMINATIONS.length} valores
            </span>
          </div>

          <div className="cash-table-wrapper">
            <table className="cash-table">
              <thead>
                <tr>
                  <th>Denominación</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {cashCount.items.map((item) => (
                  <tr key={item.denomination}>
                    <td>
                      <span className="cash-denomination">
                        {formatCurrency(item.denomination)}
                      </span>
                    </td>

                    <td>
                      <input
                        className="cash-quantity-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                        aria-label={`Cantidad de ${formatCurrency(item.denomination)}`}
                        value={quantities[item.denomination] ?? ''}
                        onChange={(event) =>
                          handleQuantityChange(
                            item.denomination,
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <span className="cash-subtotal">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="cash-summary">
          <div className="cash-summary-heading">
            <p>RESUMEN DEL CONTEO</p>
            <h3>Total contado</h3>
          </div>

          <div className="cash-total-card">
            <span>Dinero total</span>
            <strong>{formatCurrency(cashCount.totalAmount)}</strong>
            <small>Valor total de la caja</small>
          </div>

          <div className="cash-summary-row">
            <div>
              <span>Billetes</span>
              <small>{cashCount.totalBills} unidades</small>
            </div>
            <strong>
              {formatCurrency(
                cashCount.items
                  .filter((item) => item.denomination >= 2000)
                  .reduce((total, item) => total + item.subtotal, 0),
              )}
            </strong>
          </div>

          <div className="cash-summary-row">
            <div>
              <span>Monedas</span>
              <small>{cashCount.totalCoins} unidades</small>
            </div>
            <strong>
              {formatCurrency(
                cashCount.items
                  .filter((item) => item.denomination <= 1000)
                  .reduce((total, item) => total + item.subtotal, 0),
              )}
            </strong>
          </div>

          <div className="cash-summary-row cash-units-row">
            <span>Total de unidades</span>
            <strong>{cashCount.totalUnits}</strong>
          </div>

          <div className="cash-summary-footer">
            <span>Estado del conteo</span>
            <strong>
              {cashCount.totalUnits > 0
                ? 'Con cantidades registradas'
                : 'Sin cantidades registradas'}
            </strong>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CashCountPage
