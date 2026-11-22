import { Link } from 'react-router-dom'
import { usePublicSettings } from '../../hooks/useSettings'

import { TbBrandMeta } from 'react-icons/tb'
import { IoLogoInstagram } from 'react-icons/io'
import { RiTwitterXLine } from 'react-icons/ri'

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { to: '/collection/all', label: 'All products' },
      { to: '/flash-sale', label: 'Flash sale' },
      { to: '/shops', label: 'Shops' },
      { to: '/compare', label: 'Compare products' }
    ]
  },
  {
    title: 'Your account',
    links: [
      { to: '/profile?tab=orders', label: 'Order status' },
      { to: '/profile?tab=orders', label: 'Returns' },
      { to: '/profile?tab=following', label: 'Followed shops' },
      { to: '/cart', label: 'Cart' }
    ]
  },
  {
    title: 'Sell',
    links: [{ to: '/profile?tab=seller', label: 'Open a shop' }]
  }
]

const Footer = () => {
  const { data: settingsData } = usePublicSettings('general')
  const settings = settingsData?.settings || {}
  const companyName = settings.store_name || 'Tech Shop'
  // Chi hien thong tin lien he da cau hinh, khong bia dia chi/so dien thoai
  const contacts = [settings.store_address, settings.store_phone, settings.store_email].filter(Boolean)
  // Chua cau hinh link mang xa hoi thi an icon, khong de link chet '#'
  const socials = [
    { url: settings.facebook_url, label: 'Facebook', Icon: TbBrandMeta },
    { url: settings.instagram_url, label: 'Instagram', Icon: IoLogoInstagram },
    { url: settings.twitter_url, label: 'X (Twitter)', Icon: RiTwitterXLine }
  ].filter(s => !!s.url)
  const copyrightYear = settings.copyright_year || new Date().getFullYear()

  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="section-wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-xl font-bold tracking-tight">{companyName}</p>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            A marketplace for tech from independent, reviewed sellers.
          </p>
          {contacts.length > 0 && (
            <ul className="mt-5 space-y-1 text-sm text-white/70">
              {contacts.map(c => (
                <li key={c} className="break-words">
                  {c}
                </li>
              ))}
            </ul>
          )}
          {socials.length > 0 && (
            <div className="mt-5 flex gap-4">
              {socials.map(({ url, label, Icon }) => (
                <a
                  key={label}
                  href={url}
                  aria-label={label}
                  className="text-white/70 hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
        {COLUMNS.map(col => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-white/80 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="section-wrap flex flex-col gap-3 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {copyrightYear} {companyName}
          </p>
          {/* Chi liet ke phuong thuc san thuc su ho tro (xem Checkout) */}
          <p className="flex items-center gap-2">
            We accept
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-white">Cash on delivery</span>
            <span className="rounded-md bg-[#a50064] px-2 py-0.5 font-medium text-white">MoMo</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
