import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ShieldCheck, Truck, Store } from 'lucide-react'
import HeroImg from '../../../assets/Hero.svg'
import { usePublicSettings } from '../../hooks/useSettings'

const PERKS = [
  { icon: BadgeCheck, title: 'Verified shops', desc: 'Every seller is reviewed' },
  { icon: Truck, title: 'Tracked delivery', desc: 'Follow orders to your door' },
  { icon: ShieldCheck, title: 'Secure checkout', desc: 'COD, MoMo and more' },
  { icon: Store, title: 'One cart, many shops', desc: 'Buy from several sellers at once' }
]

const Hero = () => {
  const { data } = usePublicSettings('general')
  const storeName = data?.settings?.store_name || 'Tech Shop'
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white">
        <div className="grid lg:grid-cols-2 items-center gap-6 px-6 sm:px-10 py-10 lg:py-12">
          <div>
            <span className="inline-block text-xs font-medium bg-white/15 rounded-full px-3 py-1">
              {storeName} marketplace
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 leading-tight">
              Tech from trusted shops, all in one cart
            </h1>
            <p className="text-blue-100 mt-4 max-w-lg">
              Compare phones, laptops and accessories from verified sellers, and let
              our AI assistant help you pick.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to="/collection/all"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50"
              >
                Shop now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/profile?tab=seller"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/40 font-semibold rounded-lg hover:bg-white/10"
              >
                Sell on {storeName}
              </Link>
            </div>
          </div>
          <img src={HeroImg} alt="" className="hidden lg:block w-full max-w-lg justify-self-end" />
        </div>
      </div>

      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {PERKS.map(p => (
          <li key={p.title} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <p.icon className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{p.title}</span>
              <span className="block text-xs text-gray-500 truncate">{p.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Hero
