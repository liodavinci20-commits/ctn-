import React from 'react';

export default function Badge({ children, variant = 'neutral' }) {
  // variants: success, warning, danger, info, neutral
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}
