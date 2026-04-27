import { useState } from 'react'
import { usePublicSettings } from '../../hooks/useSettings'

// @ts-ignore
import LocationIcon from '../../../assets/location-icon.svg'
// @ts-ignore
import PhoneIcon from '../../../assets/phone-icon.svg'
// @ts-ignore
import EmailIcon from '../../../assets/email-icon.svg'

import { TbBrandMeta } from 'react-icons/tb'
import { IoLogoInstagram } from 'react-icons/io'
import { RiTwitterXLine } from 'react-icons/ri'

// @ts-ignore
import PayPayIcon from '../../../assets/paypal-icon.svg'
// @ts-ignore
import VisaIcon from '../../../assets/visa-icon.svg'
// @ts-ignore
import MasterCardIcon from '../../../assets/master-card.svg'
// @ts-ignore
import CompanyIcon from '../../../assets/company-icon.svg'

const Footer = () => {
  const [email, setEmail] = useState('')
  const { data: settingsData } = usePublicSettings('general')

  // Extract settings with fallback values
  const settings = settingsData?.settings || {}
  const companyName = settings.store_name || 'Tech Heim'
  const companyAddress =
    settings.store_address || '123 Main Street, Anytown, USA'
  const companyPhone = settings.store_phone || '+1 (555) 123-4567'
  const companyEmail = settings.store_email || 'TechHeimSupport@gmail.com'
  const facebookUrl = settings.facebook_url || '#'
  const instagramUrl = settings.instagram_url || '#'
  const twitterUrl = settings.twitter_url || '#'
  const copyrightYear = settings.copyright_year || '2023'

  return (
    <footer className="border-t bg-gradient-to-b from-blue-950 to-blue-900 pt-5">
      <div className="container grid gird-cols-1 xl:grid-cols-4 gap-8 px-14">
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2">Company</h3>
          <p>about us</p>
          <p>blog</p>
          <p>returns</p>
          <p>order status</p>
        </div>
        <div className="flex flex-col text-white font-thin space-y-1">
          <h3 className="text-xl font-normal mb-2">Info</h3>
          <p>How it works?</p>
          <p>our promises</p>
          <p>FAQ</p>
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
          <div className="inline-flex space-x-5 pt-3">
            <a
              href={facebookUrl}
              className="hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TbBrandMeta className="h-7 w-7" />
            </a>
            <a
              href={instagramUrl}
              className="hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IoLogoInstagram className="h-7 w-7" />
            </a>
            <a
              href={twitterUrl}
              className="hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <RiTwitterXLine className="h-7 w-7" />
            </a>
          </div>
        </div>
      </div>
      <div className="gap-3 pl-12">
        <div className="inline-flex">
          <img src={PayPayIcon} alt="paypal-icon" className="h-8 mt-8 mx-2" />
          <img src={VisaIcon} alt="visa-icon" className="h-8 mt-8 mx-2" />
          <img
            src={MasterCardIcon}
            alt="mastercard-icon"
            className="h-8 mt-8 mx-2"
          />
        </div>
      </div>
      <div className="bg-blue-950 flex flex-row justify-between text-white font-thin text-sm mt-5 py-4 pl-14">
        <div className="inline-flex gap-3">
          <img src={CompanyIcon} alt="company-icon" className="w-5 h-5" />
          <p>
            {copyrightYear} {companyName}.
          </p>
        </div>
        <div className="inline-flex space-x-6 mr-[100px]">
          <p>cookie settings</p>
          <p>Privacy Policy</p>
          <p>Terms and Conditions</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
