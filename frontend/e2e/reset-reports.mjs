// Xoa bao cao san pham cua mot san pham (de e2e chay lai duoc): dung prisma cua backend
import { prisma } from '../../backend/lib/db.js'

await prisma.productReport.deleteMany({ where: { product_id: BigInt(process.argv[2]) } })
await prisma.$disconnect()
