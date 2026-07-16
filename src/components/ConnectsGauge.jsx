import React from 'react';

export default function ConnectsGauge({ used, cap }) {
  const remaining = Math.max(cap - used, 0);
  const pct = cap > 0 ? Math.min(used / cap, 1) : 0;

  let color = '#6D5DFB'; // accent — normal
  let captionColor = 'text-muted';
  if (pct >= 0.9) {
    color = '#EF4444';
    captionColor = 'text-danger';
  } else if (pct >= 0.7) {
    color = '#F59E0B';
    captionColor = 'text-warning';
  }

  const cx = 46;
  const cy = 46;
  const r = 38;
  const startAngle = Math.PI;
  const endAngle = 0;
  const pt = (angle) => ({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  const p0 = pt(startAngle);
  const p1 = pt(endAngle);
  const arcAngle = startAngle - (startAngle - endAngle) * pct;
  const pMid = pt(arcAngle);
  const large = startAngle - arcAngle > Math.PI ? 1 : 0;

  const bgPath = `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`;
  const fgPath = `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${pMid.x} ${pMid.y}`;

  return (
    <div className="flex items-center gap-3">
      <svg width="92" height="52" viewBox="0 0 92 52">
        <path d={bgPath} stroke="#333333" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={fgPath} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
      <div>
        <div className="font-display font-bold text-2xl leading-none text-white">{remaining}</div>
        <div className={`text-[10.5px] uppercase tracking-wide mt-1 ${captionColor}`}>
          {used} / {cap} connects used
        </div>
      </div>
    </div>
  );
}
