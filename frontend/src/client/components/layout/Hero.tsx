import HeroImg from '../../../assets/Hero.svg'

const Hero = () => {
  return (
    <div className="flex flex-row items-center justify-center mb-5 p-10">
      <div className="hidden lg:flex flex-col items-start justify-center mr-[50px]">
        <h1 className="text-[50px] font-semibold text-black mb-10">
          Tech Heim
        </h1>
        <p className="text-[25px]">
          "Join the <span className="text-orange-600">digital revolution</span>"
        </p>
        <button className="bg-orange-600 px-[70px] py-3 rounded-lg text-white mt-[100px] hover:text-gray-300">
          Explore More
        </button>
      </div>
      <div>
        <img src={HeroImg} alt="Hero" />
      </div>
    </div>
  )
}

export default Hero
