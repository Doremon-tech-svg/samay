import React from 'react';

/*
  Inline SVG icons. Emoji are TEXT nodes — DOM/browser translators rewrite them
  into junk ("######", "यह है"). SVG has no text, so nothing can translate it.
  Place this file next to Icons.jsx (src/UiIcons.jsx).
*/
const PATHS = {
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></>,
    mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></>,
    scale: <><line x1="12" y1="3" x2="12" y2="21" /><line x1="5" y1="7" x2="19" y2="7" /><path d="M5 7l-3 7a3 3 0 0 0 6 0z" /><path d="M19 7l-3 7a3 3 0 0 0 6 0z" /><line x1="8" y1="21" x2="16" y2="21" /></>,
    radar: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><line x1="12" y1="12" x2="19" y2="5" /></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 6 12 13 2 6" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    landmark: <><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" /></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
};

export function Ui({ name, size = 18, strokeWidth = 2, className = '' }) {
    return (
        <svg
            className={`ui-ico ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            translate="no"
        >
            {PATHS[name] || null}
        </svg>
    );
}

/* Flag emoji (🇮🇳) also breaks under translation + renders as "IN" on some OSes */
export function IndiaFlag({ width = 20 }) {
    return (
        <svg className="ui-flag" width={width} height={(width * 2) / 3} viewBox="0 0 30 20" aria-hidden="true" focusable="false" translate="no">
            <rect width="30" height="20" rx="2.5" fill="#fff" />
            <path d="M0 2.5A2.5 2.5 0 0 1 2.5 0h25A2.5 2.5 0 0 1 30 2.5V6.67H0z" fill="#ff9933" />
            <path d="M0 13.33h30v4.17a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 0 17.5z" fill="#138808" />
            <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth=".8" />
            <circle cx="15" cy="10" r=".6" fill="#000080" />
        </svg>
    );
}