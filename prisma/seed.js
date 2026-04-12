import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin Demo",
      email: "admin@demo.com",
      password: "123456",
    },
  });

  await prisma.category.upsert({
    where: {
      userId_name_type: {
        userId: user.id,
        name: "Salário",
        type: "INCOME",
      },
    },
    update: {},
    create: {
      name: "Salário",
      type: "INCOME",
      color: "#16a34a",
      userId: user.id,
    },
  });

  await prisma.category.upsert({
    where: {
      userId_name_type: {
        userId: user.id,
        name: "Alimentação",
        type: "EXPENSE",
      },
    },
    update: {},
    create: {
      name: "Alimentação",
      type: "EXPENSE",
      color: "#ef4444",
      userId: user.id,
    },
  });

  console.log("Seed concluído com sucesso");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });