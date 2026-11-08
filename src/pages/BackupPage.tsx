
import { useState } from 'react'

import {
  createEncryptedBackup,
  restoreEncryptedBackup,
} from '../services/backupService'

import './BackupPage.css'

function BackupPage() {
  const [exportPassword, setExportPassword] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setMessage('')
    setError('')

    try {
      setLoading(true)

      const backup = await createEncryptedBackup(exportPassword)
      const url = URL.createObjectURL(backup)
      const link = document.createElement('a')

      link.href = url
      link.download = `copia-cierre-caja-${new Date()
        .toISOString()
        .slice(0, 10)}.json`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setMessage('La copia cifrada se ha generado correctamente.')
      setExportPassword('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la copia de seguridad.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    setMessage('')
    setError('')

    if (!selectedFile) {
      setError('Primero selecciona un archivo de copia de seguridad.')
      return
    }

    const confirmed = window.confirm(
      '¿Deseas comprobar e importar esta copia? Los registros existentes no se sobrescribirán.',
    )

    if (!confirmed) return

    try {
      setLoading(true)

      const result = await restoreEncryptedBackup(
        selectedFile,
        importPassword,
      )

      setMessage(
        `Importación terminada. Cierres nuevos: ${result.importedClosings}. Gastos nuevos: ${result.importedExpenses}. Auditorías nuevas: ${result.importedAuditLogs}. Configuración nueva: ${result.importedSettings}. Cierres existentes: ${result.existingClosings}. Gastos existentes: ${result.existingExpenses}. Auditorías existentes: ${result.existingAuditLogs}. Configuraciones existentes: ${result.existingSettings}.`,
      )

      setImportPassword('')
      setSelectedFile(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo importar la copia de seguridad.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backup-page">
      <section className="backup-card">
        <div className="backup-card-heading">
          <div>
            <span className="backup-label">EXPORTACIÓN</span>
            <h2>Crear copia de seguridad</h2>
          </div>
          <span className="backup-icon">↓</span>
        </div>

        <p>
          Guarda tus cierres, gastos, auditorías y configuración
          del negocio en un archivo protegido por contraseña.
        </p>

        <label htmlFor="export-password">
          Contraseña de la copia
        </label>

        <input
          id="export-password"
          type="password"
          value={exportPassword}
          onChange={(event) => setExportPassword(event.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || exportPassword.length < 8}
        >
          {loading ? 'Procesando...' : 'Crear copia cifrada'}
        </button>
      </section>

      <section className="backup-card">
        <div className="backup-card-heading">
          <div>
            <span className="backup-label">RECUPERACIÓN</span>
            <h2>Importar copia de seguridad</h2>
          </div>
          <span className="backup-icon">↑</span>
        </div>

        <p>
          Selecciona un archivo creado por esta aplicación e
          introduce la contraseña que utilizaste al exportarlo.
        </p>

        <label htmlFor="backup-file">
          Archivo de copia de seguridad
        </label>

        <input
          id="backup-file"
          type="file"
          accept=".json,application/json"
          onChange={(event) =>
            setSelectedFile(event.target.files?.[0] ?? null)
          }
        />

        {selectedFile && (
          <p className="backup-selected-file">
            Archivo seleccionado: {selectedFile.name}
          </p>
        )}

        <label htmlFor="import-password">
          Contraseña de recuperación
        </label>

        <input
          id="import-password"
          type="password"
          value={importPassword}
          onChange={(event) => setImportPassword(event.target.value)}
          placeholder="Escribe la contraseña"
          autoComplete="current-password"
        />

        <button
          type="button"
          onClick={handleImport}
          disabled={
            loading ||
            !selectedFile ||
            importPassword.length < 8
          }
        >
          {loading ? 'Procesando...' : 'Comprobar e importar'}
        </button>
      </section>

      {message && (
        <div
          className="backup-message backup-success"
          role="status"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="backup-message backup-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="backup-warning">
        <h3>Información importante</h3>

        <ul>
          <li>
            Guarda el archivo en un lugar seguro y conserva su contraseña.
          </li>
          <li>
            Si pierdes la contraseña, no podremos recuperar los datos
            cifrados desde ese archivo.
          </li>
          <li>
            La copia no se guarda automáticamente en la nube.
          </li>
          <li>
            Antes de importar, conserva una copia reciente de los datos
            actuales.
          </li>
          <li>
            La importación no sobrescribe registros existentes y cancela
            la operación si encuentra conflictos.
          </li>
        </ul>
      </section>
    </div>
  )
}

export default BackupPage
