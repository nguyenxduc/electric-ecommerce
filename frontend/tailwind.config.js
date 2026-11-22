import colors from 'tailwindcss/colors'

// Mau thuong hieu: xanh reu dam (thay xanh duong mac dinh cua Tailwind).
// Anh xa lai blue/indigo/violet/purple sang brand de toan bo class cu doi theo mot lan.
const brand = {
  50: '#eef6f2',
  100: '#d6eae1',
  200: '#aed5c4',
  300: '#7fb9a1',
  400: '#4f9a7f',
  500: '#2f7f66',
  600: '#1f6a54',
  700: '#195645',
  800: '#164539',
  900: '#123830',
  950: '#08201a'
}

// Do-cam cho gia giam, flash sale (rose cu)
const sale = {
  50: '#fff3ed',
  100: '#ffe3d4',
  200: '#ffc3a8',
  300: '#ff9a71',
  400: '#fb6a3c',
  500: '#f04a1c',
  600: '#d93a10',
  700: '#b32b10',
  800: '#8f2515',
  900: '#742215',
  950: '#3f0e07'
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand,
        sale,
        blue: brand,
        indigo: brand,
        violet: brand,
        purple: brand,
        rose: sale,
        // Xam am (stone) thay xam lanh mac dinh
        // gray-50 = mau giay: nen trang cu (bg-gray-50) khop nen chung
        gray: { ...colors.stone, 50: '#f6f4ef' },
        ink: '#17181b',
        paper: '#f6f4ef'
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)'
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.23, 1, 0.32, 1) both'
      }
    }
  },
  plugins: []
}
