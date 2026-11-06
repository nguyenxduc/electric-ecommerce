// Khoi phuc user phone sau test OTP: dung prisma cua backend
import { prisma } from '../../backend/lib/db.js'

const email = process.argv[2]
const phone = process.argv[3] || null
const user = await prisma.user.findFirst({ where: { email } })
if (user) {
  await prisma.user.update({
    where: { id: user.id },
    data: { phone, phone_verified_at: null }
  })
  await prisma.otpCode.deleteMany({ where: { phone: phone ?? undefined } })
}
await prisma.$disconnect()
