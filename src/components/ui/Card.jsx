import React from 'react';

export default function Card({ title, subtitle, topAction, children, className = '' }) {
  return (
    <div className={`card ${className}`.trim()}>
      {(title || subtitle || topAction) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {topAction}
        </div>
      )}
      {children}
    </div>
  );
}
