/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        // Custom screens — keep Tailwind's defaults but add `xs` for the
        // 480px step. Many phones are 360–414dp so this lets us scale
        // typography/grids one notch before `sm:` (640px).
        screens: {
            xs: '480px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
        extend: {
            colors: {
                // Saffron Horizon — The Digital Concierge palette
                primary: '#ab2d00',
                'primary-dim': '#962700',
                'primary-container': '#ff7851',
                'primary-fixed': '#ff7851',
                'primary-fixed-dim': '#ff5d2b',
                'on-primary': '#ffefeb',
                'on-primary-container': '#470e00',
                'on-primary-fixed': '#000000',
                'on-primary-fixed-variant': '#581300',
                secondary: '#a03739',
                'secondary-dim': '#902c2e',
                'secondary-container': '#ffc3c0',
                'secondary-fixed': '#ffc3c0',
                'secondary-fixed-dim': '#ffafac',
                'on-secondary': '#ffefee',
                'on-secondary-container': '#852327',
                'on-secondary-fixed': '#6a0e16',
                'on-secondary-fixed-variant': '#922d2f',
                tertiary: '#833e9a',
                'tertiary-dim': '#76318d',
                'tertiary-container': '#e699fd',
                'tertiary-fixed': '#e699fd',
                'tertiary-fixed-dim': '#d88cee',
                'on-tertiary': '#ffedfe',
                'on-tertiary-container': '#570e6f',
                'on-tertiary-fixed': '#360049',
                'on-tertiary-fixed-variant': '#611b79',
                error: '#b31b25',
                'error-dim': '#9f0519',
                'error-container': '#fb5151',
                'on-error': '#ffefee',
                'on-error-container': '#570008',
                background: '#fff4f3',
                'on-background': '#4e2120',
                surface: '#fff4f3',
                'surface-dim': '#ffc7c4',
                'surface-bright': '#fff4f3',
                'surface-tint': '#ab2d00',
                'surface-variant': '#ffd2d0',
                'surface-container': '#ffe1e0',
                'surface-container-low': '#ffedeb',
                'surface-container-lowest': '#ffffff',
                'surface-container-high': '#ffdad8',
                'surface-container-highest': '#ffd2d0',
                'on-surface': '#4e2120',
                'on-surface-variant': '#834c4b',
                'inverse-surface': '#240304',
                'inverse-on-surface': '#ce8c89',
                'inverse-primary': '#ff5722',
                outline: '#a26765',
                'outline-variant': '#e09c99',
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                md: '0.75rem',
                lg: '1rem',
                xl: '1.5rem',
                '2xl': '2rem',
                '3xl': '2.5rem',
                full: '9999px',
            },
            fontFamily: {
                headline: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
                body: ['Inter', 'system-ui', 'sans-serif'],
                label: ['Inter', 'system-ui', 'sans-serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'editorial-gradient': 'linear-gradient(135deg, #ab2d00 0%, #ff7851 100%)',
            },
            boxShadow: {
                editorial: '0 12px 40px rgba(78, 33, 32, 0.06)',
                'editorial-lg': '0 20px 60px rgba(78, 33, 32, 0.12)',
                'glow-primary': '0 10px 35px -5px rgba(171, 45, 0, 0.5)',
                'glow-primary-lg': '0 18px 50px -8px rgba(171, 45, 0, 0.6)',
            },
            keyframes: {
                // FAB bounces into view with a playful overshoot.
                'fab-pop': {
                    '0%': { transform: 'scale(0)', opacity: '0' },
                    '60%': { transform: 'scale(1.12)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                // Panel grows out of the corner (origin set on the element).
                'panel-in': {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.92)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                'panel-out': {
                    '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                    '100%': { opacity: '0', transform: 'translateY(16px) scale(0.94)' },
                },
                // Each chat message slides up + fades in.
                'msg-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Expanding halo rings behind the FAB to draw the eye.
                'halo-pulse': {
                    '0%': { transform: 'scale(0.85)', opacity: '0.55' },
                    '70%': { opacity: '0' },
                    '100%': { transform: 'scale(1.9)', opacity: '0' },
                },
                // Diagonal sheen sweeping across the header gradient.
                shimmer: {
                    '0%': { transform: 'translateX(-150%) skewX(-20deg)' },
                    '100%': { transform: 'translateX(250%) skewX(-20deg)' },
                },
                // Gentle idle float for the FAB.
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                // Status dot soft breathing.
                'status-pulse': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.55', transform: 'scale(0.82)' },
                },
                // Typing dots wave.
                'typing-wave': {
                    '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
                    '30%': { transform: 'translateY(-5px)', opacity: '1' },
                },
            },
            animation: {
                'fab-pop': 'fab-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                'panel-in': 'panel-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both',
                'panel-out': 'panel-out 0.2s cubic-bezier(0.4, 0, 1, 1) both',
                'msg-in': 'msg-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
                'halo-pulse': 'halo-pulse 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                shimmer: 'shimmer 4s ease-in-out infinite',
                float: 'float 3.5s ease-in-out infinite',
                'status-pulse': 'status-pulse 2s ease-in-out infinite',
                'typing-wave': 'typing-wave 1.2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}