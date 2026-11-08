
import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import CashCountPage from './pages/CashCountPage'
import ClosingPage from './pages/ClosingPage'
import ExpensesPage from './pages/ExpensesPage'
import HistoryPage from './pages/HistoryPage'
import CalendarPage from './pages/CalendarPage'
import StatisticsPage from './pages/StatisticsPage'
import BackupPage from './pages/BackupPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'

import { db } from './database/db'
import './App.css'

const sections: Record<string, string> = {
  inicio: 'Inicio',
  cierre: 'Nuevo cierre',
  efectivo: 'Conteo de efectivo',
  gastos: 'Gastos',
  historial: 'Historial',
  calendario: 'Calendario',
  estadisticas: 'Estadísticas',
  copias: 'Copias de seguridad',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
}

function App() {
  const [activeSection, setActiveSection] = useState('inicio')
  const [businessName, setBusinessName] = useState('')

  useEffect(() => {
    let active = true

    async function loadBusinessName() {
      try {
        const settings = await db.settings.get('main')

        if (active) {
          setBusinessName(settings?.businessName ?? '')
        }
      } catch {
        if (active) {
          setBusinessName('')
        }
      }
    }

    function handleSettingsUpdated(event: Event) {
      const customEvent = event as CustomEvent<string>
      setBusinessName(customEvent.detail || '')
    }

    void loadBusinessName()

    window.addEventListener(
      'business-settings-updated',
      handleSettingsUpdated,
    )

    return () => {
      active = false
      window.removeEventListener(
        'business-settings-updated',
        handleSettingsUpdated,
      )
    }
  }, [])

  return (
    <div className="app">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
      />

      <main className="app-main">
        <header className="main-header">
          <div>
            <p className="header-subtitle">
              {businessName || 'GESTIÓN DIARIA'}
            </p>
            <h1>{sections[activeSection] ?? 'Inicio'}</h1>
          </div>
        </header>

        <section className="content-area">
          {activeSection === 'inicio' ? (
            <DashboardPage onNavigate={setActiveSection} />
          ) : activeSection === 'cierre' ? (
            <ClosingPage />
          ) : activeSection === 'efectivo' ? (
            <CashCountPage />
          ) : activeSection === 'gastos' ? (
            <ExpensesPage />
          ) : activeSection === 'historial' ? (
            <HistoryPage />
          ) : activeSection === 'calendario' ? (
            <CalendarPage />
          ) : activeSection === 'estadisticas' ? (
            <StatisticsPage />
          ) : activeSection === 'copias' ? (
            <BackupPage />
          ) : activeSection === 'auditoria' ? (
            <AuditPage />
          ) : activeSection === 'configuracion' ? (
            <SettingsPage />
          ) : (
            <div className="welcome-card">
              <h2>{sections[activeSection] ?? 'Sección'}</h2>
              <p>
                Esta sección estará disponible cuando
                desarrollemos sus funciones.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
