// Xoa cau hoi cua mot san pham (de e2e chay lai duoc): dung prisma cua backend
import { prisma } from '../../backend/lib/db.js'

await prisma.productQuestion.deleteMany({ where: { product_id: BigInt(process.argv[2]) } })
await prisma.$disconnect()
