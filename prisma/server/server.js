import express from "express";
import cors from "cors";
import prisma from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = "management-system-secret-key";

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token não enviado" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

async function createDefaultCategories(userId) {
  const defaults = [
    { name: "Salary", type: "INCOME", color: "#22c55e" },
    { name: "Sales", type: "INCOME", color: "#06b6d4" },
    { name: "Food", type: "EXPENSE", color: "#ef4444" },
    { name: "Transport", type: "EXPENSE", color: "#f59e0b" },
    { name: "Software", type: "EXPENSE", color: "#8b5cf6" },
  ];

  for (const item of defaults) {
    await prisma.category.upsert({
      where: {
        userId_name_type: {
          userId,
          name: item.name,
          type: item.type,
        },
      },
      update: {},
      create: {
        userId,
        name: item.name,
        type: item.type,
        color: item.color,
      },
    });
  }
}

/* =========================
   TESTE
========================= */

app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "backend funcionando" });
});

/* =========================
   AUTH
========================= */

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || "User",
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    await createDefaultCategories(user.id);

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("ERRO REGISTER:", error);
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("ERRO LOGIN:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("ERRO ME:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

/* =========================
   TRANSACTIONS
========================= */

app.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const where = { userId: req.user.userId };

    if (month) {
      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      where.date = {
        gte: start,
        lt: end,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    });

    res.json(transactions);
  } catch (error) {
    console.error("ERRO GET /transactions:", error);
    res.status(500).json({ error: "Erro ao buscar transações" });
  }
});

app.post("/transactions", authMiddleware, async (req, res) => {
  try {
    const { title, amount, categoryId, date } = req.body;

    if (!title || !amount || !categoryId || !date) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: req.user.userId,
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    const transaction = await prisma.transaction.create({
      data: {
        title,
        amountCents: Number(amount),
        date: new Date(date),
        userId: req.user.userId,
        categoryId: category.id,
      },
      include: { category: true },
    });

    res.json(transaction);
  } catch (error) {
    console.error("ERRO POST /transactions:", error);
    res.status(500).json({ error: "Erro ao criar transação" });
  }
});

app.put("/transactions/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, categoryId, date } = req.body;

    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: req.user.userId,
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        title,
        amountCents: Number(amount),
        categoryId: category.id,
        date: new Date(date),
      },
      include: { category: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("ERRO PUT /transactions/:id:", error);
    res.status(500).json({ error: "Erro ao editar transação" });
  }
});

app.delete("/transactions/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("ERRO DELETE /transactions/:id:", error);
    res.status(500).json({ error: "Erro ao excluir transação" });
  }
});

/* =========================
   CATEGORIES
========================= */

app.get("/categories", authMiddleware, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    res.json(categories);
  } catch (error) {
    console.error("ERRO GET /categories:", error);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
});

app.post("/categories", authMiddleware, async (req, res) => {
  try {
    const { name, type, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Nome e tipo são obrigatórios" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color: color || "#7c3aed",
        userId: req.user.userId,
      },
    });

    res.json(category);
  } catch (error) {
    console.error("ERRO POST /categories:", error);
    res.status(500).json({ error: "Erro ao criar categoria" });
  }
});

/* =========================
   START
========================= */

app.listen(3001, () => {
  console.log("Server rodando na porta 3001");
});