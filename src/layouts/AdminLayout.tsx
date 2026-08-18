import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Megaphone, Wrench, Zap } from 'lucide-react';

const tabs: Array<{
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  end?: boolean;
}> = [
  { to: '/admin', label: '總覽', icon: LayoutGrid, end: true },
  { to: '/admin/broadcast', label: '廣播', icon: Megaphone },
  { to: '/admin/events', label: '事件', icon: Zap },
  { to: '/admin/overrides', label: '覆寫', icon: Wrench },
];

export function AdminLayout() {
  return (
    <div className="layout-with-tabs">
      <Outlet />
      <nav className="tab-bar">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
