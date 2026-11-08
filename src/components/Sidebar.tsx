
import './Sidebar.css'

interface SidebarProps {
  activeSection: string
  onSelect: (section: string) => void
}

const menuItems = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'cierre', label: 'Nuevo cierre', icon: '▣' },
  { id: 'efectivo', label: 'Conteo de efectivo', icon: '＄' },
  { id: 'gastos', label: 'Gastos', icon: '▤' },
  { id: 'historial', label: 'Historial', icon: '◷' },
  { id: 'calendario', label: 'Calendario', icon: '▦' },
  { id: 'estadisticas', label: 'Estadísticas', icon: '▥' },
  { id: 'copias', label: 'Copias de seguridad', icon: '▧' },
  { id: 'auditoria', label: 'Auditoría', icon: '◉' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙' },
]

function Sidebar({ activeSection, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">CC</div>

        <div>
          <h2>Cierre de Caja</h2>
          <p>Gestión de negocio</p>
        </div>
      </div>

      <nav className="sidebar-navigation">
        <p className="sidebar-heading">MENÚ PRINCIPAL</p>

        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${
              activeSection === item.id ? 'active' : ''
            }`}
            onClick={() => onSelect(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="status-indicator"></span>
        <span>Almacenamiento local</span>
      </div>
    </aside>
  )
}

export default Sidebar
