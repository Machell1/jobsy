import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

const COUNTRY_CODES = [
  // Jamaica first (default)
  { code: '+1876', flag: '🇯🇲', name: 'Jamaica (+1876)', digits: 7 },
  { code: '+1658', flag: '🇯🇲', name: 'Jamaica (+1658)', digits: 7 },
  // Caribbean
  { code: '+1268', flag: '🇦🇬', name: 'Antigua & Barbuda', digits: 7 },
  { code: '+1264', flag: '🇦🇮', name: 'Anguilla', digits: 7 },
  { code: '+297', flag: '🇦🇼', name: 'Aruba', digits: 7 },
  { code: '+1242', flag: '🇧🇸', name: 'Bahamas', digits: 7 },
  { code: '+1246', flag: '🇧🇧', name: 'Barbados', digits: 7 },
  { code: '+1441', flag: '🇧🇲', name: 'Bermuda', digits: 7 },
  { code: '+1284', flag: '🇻🇬', name: 'British Virgin Islands', digits: 7 },
  { code: '+1345', flag: '🇰🇾', name: 'Cayman Islands', digits: 7 },
  { code: '+599', flag: '🇨🇼', name: 'Curaçao', digits: 7 },
  { code: '+1767', flag: '🇩🇲', name: 'Dominica', digits: 7 },
  { code: '+1809', flag: '🇩🇴', name: 'Dominican Republic', digits: 7 },
  { code: '+1473', flag: '🇬🇩', name: 'Grenada', digits: 7 },
  { code: '+590', flag: '🇬🇵', name: 'Guadeloupe', digits: 9 },
  { code: '+592', flag: '🇬🇾', name: 'Guyana', digits: 7 },
  { code: '+509', flag: '🇭🇹', name: 'Haiti', digits: 8 },
  { code: '+596', flag: '🇲🇶', name: 'Martinique', digits: 9 },
  { code: '+1664', flag: '🇲🇸', name: 'Montserrat', digits: 7 },
  { code: '+1787', flag: '🇵🇷', name: 'Puerto Rico', digits: 7 },
  { code: '+1869', flag: '🇰🇳', name: 'St. Kitts & Nevis', digits: 7 },
  { code: '+1758', flag: '🇱🇨', name: 'Saint Lucia', digits: 7 },
  { code: '+1784', flag: '🇻🇨', name: 'St. Vincent', digits: 7 },
  { code: '+597', flag: '🇸🇷', name: 'Suriname', digits: 7 },
  { code: '+1868', flag: '🇹🇹', name: 'Trinidad & Tobago', digits: 7 },
  { code: '+1649', flag: '🇹🇨', name: 'Turks & Caicos', digits: 7 },
  { code: '+1340', flag: '🇻🇮', name: 'U.S. Virgin Islands', digits: 7 },
  // North America
  { code: '+1', flag: '🇺🇸', name: 'United States', digits: 10 },
  { code: '+1', flag: '🇨🇦', name: 'Canada', digits: 10 },
  { code: '+52', flag: '🇲🇽', name: 'Mexico', digits: 10 },
  // Central America
  { code: '+501', flag: '🇧🇿', name: 'Belize', digits: 7 },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica', digits: 8 },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador', digits: 8 },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala', digits: 8 },
  { code: '+504', flag: '🇭🇳', name: 'Honduras', digits: 8 },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua', digits: 8 },
  { code: '+507', flag: '🇵🇦', name: 'Panama', digits: 8 },
  // South America
  { code: '+54', flag: '🇦🇷', name: 'Argentina', digits: 10 },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia', digits: 8 },
  { code: '+55', flag: '🇧🇷', name: 'Brazil', digits: 11 },
  { code: '+56', flag: '🇨🇱', name: 'Chile', digits: 9 },
  { code: '+57', flag: '🇨🇴', name: 'Colombia', digits: 10 },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador', digits: 9 },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay', digits: 9 },
  { code: '+51', flag: '🇵🇪', name: 'Peru', digits: 9 },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay', digits: 8 },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela', digits: 10 },
  // Europe
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', digits: 10 },
  { code: '+353', flag: '🇮🇪', name: 'Ireland', digits: 9 },
  { code: '+33', flag: '🇫🇷', name: 'France', digits: 9 },
  { code: '+49', flag: '🇩🇪', name: 'Germany', digits: 11 },
  { code: '+39', flag: '🇮🇹', name: 'Italy', digits: 10 },
  { code: '+34', flag: '🇪🇸', name: 'Spain', digits: 9 },
  { code: '+351', flag: '🇵🇹', name: 'Portugal', digits: 9 },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands', digits: 9 },
  { code: '+32', flag: '🇧🇪', name: 'Belgium', digits: 9 },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland', digits: 9 },
  { code: '+43', flag: '🇦🇹', name: 'Austria', digits: 10 },
  { code: '+46', flag: '🇸🇪', name: 'Sweden', digits: 9 },
  { code: '+47', flag: '🇳🇴', name: 'Norway', digits: 8 },
  { code: '+45', flag: '🇩🇰', name: 'Denmark', digits: 8 },
  { code: '+358', flag: '🇫🇮', name: 'Finland', digits: 10 },
  { code: '+48', flag: '🇵🇱', name: 'Poland', digits: 9 },
  { code: '+420', flag: '🇨🇿', name: 'Czech Republic', digits: 9 },
  { code: '+421', flag: '🇸🇰', name: 'Slovakia', digits: 9 },
  { code: '+36', flag: '🇭🇺', name: 'Hungary', digits: 9 },
  { code: '+40', flag: '🇷🇴', name: 'Romania', digits: 9 },
  { code: '+359', flag: '🇧🇬', name: 'Bulgaria', digits: 9 },
  { code: '+385', flag: '🇭🇷', name: 'Croatia', digits: 9 },
  { code: '+386', flag: '🇸🇮', name: 'Slovenia', digits: 8 },
  { code: '+381', flag: '🇷🇸', name: 'Serbia', digits: 9 },
  { code: '+387', flag: '🇧🇦', name: 'Bosnia & Herzegovina', digits: 8 },
  { code: '+382', flag: '🇲🇪', name: 'Montenegro', digits: 8 },
  { code: '+389', flag: '🇲🇰', name: 'North Macedonia', digits: 8 },
  { code: '+355', flag: '🇦🇱', name: 'Albania', digits: 9 },
  { code: '+383', flag: '🇽🇰', name: 'Kosovo', digits: 8 },
  { code: '+30', flag: '🇬🇷', name: 'Greece', digits: 10 },
  { code: '+90', flag: '🇹🇷', name: 'Turkey', digits: 10 },
  { code: '+357', flag: '🇨🇾', name: 'Cyprus', digits: 8 },
  { code: '+356', flag: '🇲🇹', name: 'Malta', digits: 8 },
  { code: '+354', flag: '🇮🇸', name: 'Iceland', digits: 7 },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg', digits: 9 },
  { code: '+370', flag: '🇱🇹', name: 'Lithuania', digits: 8 },
  { code: '+371', flag: '🇱🇻', name: 'Latvia', digits: 8 },
  { code: '+372', flag: '🇪🇪', name: 'Estonia', digits: 8 },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine', digits: 9 },
  { code: '+375', flag: '🇧🇾', name: 'Belarus', digits: 9 },
  { code: '+373', flag: '🇲🇩', name: 'Moldova', digits: 8 },
  { code: '+7', flag: '🇷🇺', name: 'Russia', digits: 10 },
  { code: '+995', flag: '🇬🇪', name: 'Georgia', digits: 9 },
  { code: '+374', flag: '🇦🇲', name: 'Armenia', digits: 8 },
  { code: '+994', flag: '🇦🇿', name: 'Azerbaijan', digits: 9 },
  // Africa
  { code: '+234', flag: '🇳🇬', name: 'Nigeria', digits: 10 },
  { code: '+233', flag: '🇬🇭', name: 'Ghana', digits: 9 },
  { code: '+254', flag: '🇰🇪', name: 'Kenya', digits: 9 },
  { code: '+27', flag: '🇿🇦', name: 'South Africa', digits: 9 },
  { code: '+20', flag: '🇪🇬', name: 'Egypt', digits: 10 },
  { code: '+212', flag: '🇲🇦', name: 'Morocco', digits: 9 },
  { code: '+213', flag: '🇩🇿', name: 'Algeria', digits: 9 },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia', digits: 8 },
  { code: '+218', flag: '🇱🇾', name: 'Libya', digits: 9 },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia', digits: 9 },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania', digits: 9 },
  { code: '+256', flag: '🇺🇬', name: 'Uganda', digits: 9 },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda', digits: 9 },
  { code: '+243', flag: '🇨🇩', name: 'DR Congo', digits: 9 },
  { code: '+237', flag: '🇨🇲', name: 'Cameroon', digits: 9 },
  { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire", digits: 10 },
  { code: '+221', flag: '🇸🇳', name: 'Senegal', digits: 9 },
  { code: '+228', flag: '🇹🇬', name: 'Togo', digits: 8 },
  { code: '+229', flag: '🇧🇯', name: 'Benin', digits: 8 },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso', digits: 8 },
  { code: '+223', flag: '🇲🇱', name: 'Mali', digits: 8 },
  { code: '+227', flag: '🇳🇪', name: 'Niger', digits: 8 },
  { code: '+224', flag: '🇬🇳', name: 'Guinea', digits: 9 },
  { code: '+232', flag: '🇸🇱', name: 'Sierra Leone', digits: 8 },
  { code: '+231', flag: '🇱🇷', name: 'Liberia', digits: 7 },
  { code: '+220', flag: '🇬🇲', name: 'Gambia', digits: 7 },
  { code: '+238', flag: '🇨🇻', name: 'Cape Verde', digits: 7 },
  { code: '+244', flag: '🇦🇴', name: 'Angola', digits: 9 },
  { code: '+258', flag: '🇲🇿', name: 'Mozambique', digits: 9 },
  { code: '+260', flag: '🇿🇲', name: 'Zambia', digits: 9 },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe', digits: 9 },
  { code: '+267', flag: '🇧🇼', name: 'Botswana', digits: 8 },
  { code: '+264', flag: '🇳🇦', name: 'Namibia', digits: 9 },
  { code: '+230', flag: '🇲🇺', name: 'Mauritius', digits: 8 },
  { code: '+261', flag: '🇲🇬', name: 'Madagascar', digits: 9 },
  { code: '+252', flag: '🇸🇴', name: 'Somalia', digits: 8 },
  { code: '+253', flag: '🇩🇯', name: 'Djibouti', digits: 8 },
  { code: '+291', flag: '🇪🇷', name: 'Eritrea', digits: 7 },
  { code: '+249', flag: '🇸🇩', name: 'Sudan', digits: 9 },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan', digits: 9 },
  { code: '+235', flag: '🇹🇩', name: 'Chad', digits: 8 },
  { code: '+236', flag: '🇨🇫', name: 'Central African Republic', digits: 8 },
  { code: '+241', flag: '🇬🇦', name: 'Gabon', digits: 7 },
  { code: '+242', flag: '🇨🇬', name: 'Congo', digits: 9 },
  { code: '+240', flag: '🇬🇶', name: 'Equatorial Guinea', digits: 9 },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé & Príncipe', digits: 7 },
  { code: '+265', flag: '🇲🇼', name: 'Malawi', digits: 9 },
  { code: '+266', flag: '🇱🇸', name: 'Lesotho', digits: 8 },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini', digits: 8 },
  { code: '+257', flag: '🇧🇮', name: 'Burundi', digits: 8 },
  { code: '+269', flag: '🇰🇲', name: 'Comoros', digits: 7 },
  { code: '+262', flag: '🇷🇪', name: 'Réunion', digits: 9 },
  { code: '+248', flag: '🇸🇨', name: 'Seychelles', digits: 7 },
  // Middle East
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9 },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates', digits: 9 },
  { code: '+974', flag: '🇶🇦', name: 'Qatar', digits: 8 },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', digits: 8 },
  { code: '+968', flag: '🇴🇲', name: 'Oman', digits: 8 },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', digits: 8 },
  { code: '+962', flag: '🇯🇴', name: 'Jordan', digits: 9 },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon', digits: 8 },
  { code: '+972', flag: '🇮🇱', name: 'Israel', digits: 9 },
  { code: '+970', flag: '🇵🇸', name: 'Palestine', digits: 9 },
  { code: '+964', flag: '🇮🇶', name: 'Iraq', digits: 10 },
  { code: '+963', flag: '🇸🇾', name: 'Syria', digits: 9 },
  { code: '+967', flag: '🇾🇪', name: 'Yemen', digits: 9 },
  { code: '+98', flag: '🇮🇷', name: 'Iran', digits: 10 },
  // South Asia
  { code: '+91', flag: '🇮🇳', name: 'India', digits: 10 },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan', digits: 10 },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh', digits: 10 },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka', digits: 9 },
  { code: '+977', flag: '🇳🇵', name: 'Nepal', digits: 10 },
  { code: '+93', flag: '🇦🇫', name: 'Afghanistan', digits: 9 },
  { code: '+960', flag: '🇲🇻', name: 'Maldives', digits: 7 },
  { code: '+975', flag: '🇧🇹', name: 'Bhutan', digits: 8 },
  // East Asia
  { code: '+86', flag: '🇨🇳', name: 'China', digits: 11 },
  { code: '+81', flag: '🇯🇵', name: 'Japan', digits: 10 },
  { code: '+82', flag: '🇰🇷', name: 'South Korea', digits: 10 },
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong', digits: 8 },
  { code: '+853', flag: '🇲🇴', name: 'Macau', digits: 8 },
  { code: '+886', flag: '🇹🇼', name: 'Taiwan', digits: 9 },
  { code: '+976', flag: '🇲🇳', name: 'Mongolia', digits: 8 },
  // Southeast Asia
  { code: '+65', flag: '🇸🇬', name: 'Singapore', digits: 8 },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia', digits: 10 },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia', digits: 11 },
  { code: '+63', flag: '🇵🇭', name: 'Philippines', digits: 10 },
  { code: '+66', flag: '🇹🇭', name: 'Thailand', digits: 9 },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam', digits: 9 },
  { code: '+95', flag: '🇲🇲', name: 'Myanmar', digits: 9 },
  { code: '+855', flag: '🇰🇭', name: 'Cambodia', digits: 9 },
  { code: '+856', flag: '🇱🇦', name: 'Laos', digits: 9 },
  { code: '+673', flag: '🇧🇳', name: 'Brunei', digits: 7 },
  { code: '+670', flag: '🇹🇱', name: 'Timor-Leste', digits: 8 },
  // Central Asia
  { code: '+7', flag: '🇰🇿', name: 'Kazakhstan', digits: 10 },
  { code: '+998', flag: '🇺🇿', name: 'Uzbekistan', digits: 9 },
  { code: '+996', flag: '🇰🇬', name: 'Kyrgyzstan', digits: 9 },
  { code: '+992', flag: '🇹🇯', name: 'Tajikistan', digits: 9 },
  { code: '+993', flag: '🇹🇲', name: 'Turkmenistan', digits: 8 },
  // Oceania
  { code: '+61', flag: '🇦🇺', name: 'Australia', digits: 9 },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand', digits: 9 },
  { code: '+675', flag: '🇵🇬', name: 'Papua New Guinea', digits: 8 },
  { code: '+679', flag: '🇫🇯', name: 'Fiji', digits: 7 },
  { code: '+685', flag: '🇼🇸', name: 'Samoa', digits: 7 },
  { code: '+676', flag: '🇹🇴', name: 'Tonga', digits: 7 },
  { code: '+678', flag: '🇻🇺', name: 'Vanuatu', digits: 7 },
  { code: '+677', flag: '🇸🇧', name: 'Solomon Islands', digits: 7 },
  { code: '+686', flag: '🇰🇮', name: 'Kiribati', digits: 8 },
  { code: '+691', flag: '🇫🇲', name: 'Micronesia', digits: 7 },
  { code: '+680', flag: '🇵🇼', name: 'Palau', digits: 7 },
  { code: '+692', flag: '🇲🇭', name: 'Marshall Islands', digits: 7 },
  { code: '+688', flag: '🇹🇻', name: 'Tuvalu', digits: 6 },
  { code: '+674', flag: '🇳🇷', name: 'Nauru', digits: 7 },
]

type CountryEntry = typeof COUNTRY_CODES[number]

interface PhoneInputProps {
  value: string
  onChange: (fullNumber: string) => void
  label?: string
  error?: string
  disabled?: boolean
  id?: string
  className?: string
  required?: boolean
}

function detectCountry(value: string): CountryEntry {
  if (!value) return COUNTRY_CODES[0]
  const clean = value.startsWith('+') ? value : `+${value}`
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const entry of sorted) {
    if (clean.startsWith(entry.code)) return entry
  }
  return COUNTRY_CODES[0]
}

function stripCode(value: string, code: string): string {
  const clean = value.startsWith('+') ? value : `+${value}`
  if (clean.startsWith(code)) return clean.slice(code.length)
  return value.replace(/^\+/, '')
}

export default function PhoneInput({
  value,
  onChange,
  label = 'Phone Number',
  error,
  disabled = false,
  id = 'phone',
  className = '',
  required = false,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = detectCountry(value)
  const localDigits = stripCode(value, selected.code)

  const filtered = search
    ? COUNTRY_CODES.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.code.includes(search)
      )
    : COUNTRY_CODES

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, selected.digits)
    onChange(`${selected.code}${digits}`)
  }

  const handleCountrySelect = (entry: CountryEntry) => {
    setIsOpen(false)
    setSearch('')
    onChange(`${entry.code}${localDigits.slice(0, entry.digits)}`)
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex" ref={dropdownRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`flex items-center gap-1 px-3 py-3 border border-r-0 rounded-l-lg text-sm font-medium bg-gray-50 hover:bg-gray-100 transition whitespace-nowrap ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="text-gray-700">{selected.code}</span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700/30 focus:border-green-700"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-400 text-center">No countries found</p>
                ) : (
                  filtered.map((entry, i) => (
                    <button
                      key={`${entry.code}-${entry.name}-${i}`}
                      type="button"
                      onClick={() => handleCountrySelect(entry)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-50 transition text-left ${
                        entry.code === selected.code && entry.name === selected.name ? 'bg-green-50 font-medium' : ''
                      }`}
                    >
                      <span className="text-base">{entry.flag}</span>
                      <span className="text-gray-900 truncate">{entry.name}</span>
                      <span className="text-gray-400 ml-auto text-xs">{entry.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            value={localDigits}
            onChange={handleDigitChange}
            placeholder={`${selected.digits}-digit number`}
            maxLength={selected.digits}
            disabled={disabled}
            required={required}
            autoComplete="tel"
            className={`w-full px-4 py-3 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700 text-sm ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
