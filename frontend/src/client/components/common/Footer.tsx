import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicSettings } from '../../hooks/useSettings'

import LocationIcon from '../../../assets/location-icon.svg'
import PhoneIcon from '../../../assets/phone-icon.svg'
import EmailIcon from '../../../assets/email-icon.svg'

import { TbBrandMeta } from 'react-icons/tb'
import { IoLogoInstagram } from 'react-icons/io'
import { RiTwitterXLine } from 'react-icons/ri'

import CompanyIcon from '../../../assets/company-icon.svg'

const Footer = () => {
  const [email, setEmail] = useState('')
  const { data: settingsData } = usePublicSettings('general')

  // Extract settings with fallback values
  const settings = settingsData?.settings || {}
  const companyName = settings.store_name || 'Tech Shop'
  const companyAddress =
    settings.store_address || '123 Main Street, Anytown, USA'
  const companyPhone = settings.store_phone || '+1 (555) 123-4567'
  const companyEmail = settings.store_email || 'TechHeimSupport@gmail.com'
  // Chua cau hinh link mang xa hoi thi an icon, khong de link chet '#'
  const socials = [
    { url: settings.facebook_url, label: 'Facebook', Icon: TbBrandMeta },
    { url: settings.instagram_url, label: 'Instagram', Icon: IoLogoInstagram },
    { url: settings.twitter_url, label: 'X (Twitter)', Icon: RiTwitterXLine }
  ].filter(s => !!s.url)
  const copyrightYear = settings.copyright_year || new Date().getFullYear()

  return (
    <footer className="border-t bg-gradient-to-b from-blue-950 to-blue-900 pt-5">
      <div className="container grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 px-6 sm:px-14">
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2">Company</h3>
          <Link to="/profile?tab=orders" className="hover:text-gray-300">
            order status
          </Link>
          <Link to="/profile?tab=orders" className="hover:text-gray-300">
            returns
          </Link>
        </div>
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2">Shop</h3>
          <Link to="/collection/all" className="hover:text-gray-300">
            all products
          </Link>
          <Link to="/cart" className="hover:text-gray-300">
            cart
          </Link>
        </div>
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2">Contact us</h3>
          <div className="inline-flex">
            <img
              src={LocationIcon}
              alt="location-icon"
              className="w-4 h-4 mr-2 mt-1"
            />
            <p className="text-nowrap">{companyAddress}</p>
          </div>
          <div className="inline-flex">
            <img
              src={PhoneIcon}
              alt="phone-icon"
              className="w-4 h-4 mr-2 mt-1"
            />
            <p>{companyPhone}</p>
          </div>
          <div className="inline-flex">
            <img
              src={EmailIcon}
              alt="email-icon"
              className="w-4 h-4 mr-2 mt-1"
            />
            <p>{companyEmail}</p>
          </div>
        </div>
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2 text-nowrap">
            Sign up for News and updates
          </h3>
          <div className="w-full max-w-[300px]">
            <input
              type="text"
              placeholder="E-mail Address"
              className="border border-white bg-transparent px-4 py-3 rounded-md w-full placeholder-white font-normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          {socials.length > 0 && (
            <div className="inline-flex space-x-5 pt-3">
              {socials.map(({ url, label, Icon }) => (
                <a
                  key={label}
                  href={url}
                  aria-label={label}
                  className="hover:text-gray-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="h-7 w-7" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Chi liet ke phuong thuc san thuc su ho tro (xem Checkout) */}
      <div className="flex flex-wrap items-center gap-2 px-6 sm:pl-14 mt-8 text-sm">
        <span className="text-blue-200 mr-1">We accept</span>
        <span className="bg-white text-blue-950 font-semibold rounded px-3 py-1">Cash on delivery</span>
        <span className="bg-[#a50064] text-white font-semibold rounded px-3 py-1">MoMo</span>
      </div>
      <div className="bg-blue-950 flex flex-col sm:flex-row gap-3 sm:justify-between text-white font-thin text-sm mt-5 py-4 px-6 sm:pl-14 sm:pr-0">
        <div className="inline-flex gap-3">
          <img src={CompanyIcon} alt="company-icon" className="w-5 h-5" />
          <p className="whitespace-nowrap">
            {copyrightYear} {companyName}.
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-x-6 gap-y-1 sm:mr-[100px]">
          <p>cookie settings</p>
          <p>Privacy Policy</p>
          <p>Terms and Conditions</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
