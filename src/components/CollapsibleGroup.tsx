import { useState, type ReactNode } from 'react';

interface CollapsibleGroupProps {
  title: string;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function CollapsibleGroup({ title, defaultOpen = true, headerRight, children }: CollapsibleGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`control-group ${open ? '' : 'collapsed'}`}>
      <div className="collapsible-header" onClick={() => setOpen(!open)}>
        <h3>
          <span className={`collapse-arrow ${open ? 'open' : ''}`}>&#9656;</span>
          {title}
        </h3>
        {headerRight && <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>}
      </div>
      {open && children}
    </div>
  );
}
