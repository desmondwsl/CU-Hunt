import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Map, Megaphone, Trophy, Users } from 'lucide-react';

const tabs = [
  { to: '/player/map', label: '地圖', icon: Map },
  { to: '/player/scores', label: '分數', icon: Trophy },
  { to: '/player/team', label: '我的', icon: Users },
  { to: '/player/feed', label: '廣播', icon: Megaphone },
  { to: '/player/book', label: '規則', icon: BookOpen },
] as const;

export function PlayerLayout() {
  return (
    <div className="layout-with-tabs">
      <Outlet />
      <nav className="tab-bar">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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
