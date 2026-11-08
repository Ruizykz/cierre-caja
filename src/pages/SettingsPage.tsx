import { useEffect, useState, type FormEvent } from 'react'
import {
  getBusinessSettings,
  saveBusinessSettings,
} from '../services/settingsService'
import './SettingsPage.css'

function SettingsPage() {
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const settings = await getBusinessSettings()

        if (active) {
          setBusinessName(settings.businessName)
          setDescription(settings.description)
        }
      } catch {
        if (active) {
          setError('No se pudo cargar la configuración.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const saved = await saveBusinessSettings(
        businessName,
        description,
      )

      setBusinessName(saved.businessName)
setDescription(saved.description)

window.dispatchEvent(
  new CustomEvent('business-settings-updated', {
    detail: saved.businessName,
  }),
)

setMessage('La configuración se guardó correctamente.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la configuración.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="settings-message">Cargando configuración...</div>
  }

  return (
    <div className="settings-page">
      <section className="settings-intro">
        <p className="settings-eyebrow">PERSONALIZACIÓN</p>
        <h2>Configuración del negocio</h2>
        <p>
          Personaliza la información básica que identifica tu
          establecimiento dentro de la aplicación.
        </p>
      </section>

      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-card-heading">
          <h3>Información general</h3>
          <p>Estos datos se guardan en este dispositivo.</p>
        </div>

        <div className="settings-field">
          <label htmlFor="businessName">Nombre del negocio</label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ejemplo: Mi negocio"
            maxLength={60}
            required
          />
          <span>Máximo 60 caracteres.</span>
        </div>

        <div className="settings-field">
          <label htmlFor="businessDescription">Descripción</label>
          <textarea
            id="businessDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe brevemente tu establecimiento..."
            maxLength={180}
            rows={4}
          />
          <span>Opcional. Máximo 180 caracteres.</span>
        </div>

        {error && (
          <p className="settings-feedback settings-feedback-error">
            {error}
          </p>
        )}

        {message && (
          <p className="settings-feedback settings-feedback-success">
            {message}
          </p>
        )}

        <button
          className="settings-save-button"
          type="submit"
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>

      <section className="settings-card settings-rules">
        <h3>Reglas actuales de la aplicación</h3>

        <div className="settings-rule">
          <span>Moneda utilizada</span>
          <strong>Peso colombiano (COP)</strong>
        </div>

        <div className="settings-rule">
          <span>Participación personal</span>
          <strong>15 %</strong>
        </div>

        <div className="settings-rule">
          <span>Participación del negocio</span>
          <strong>85 %</strong>
        </div>

        <p>
          La distribución es informativa. Los porcentajes no generan
          retiros automáticos ni modifican el efectivo de la caja.
        </p>
      </section>

      <section className="settings-storage-info">
        <h3>Almacenamiento de información</h3>
        <p>
          Los datos de esta aplicación se guardan localmente en el
          dispositivo mediante IndexedDB. Exporta periódicamente
          copias de seguridad cifradas para evitar perder información.
        </p>
      </section>
    </div>
  )
}

export default SettingsPage