import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import { motion } from "framer-motion";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
} from "lucide-react";

const monthlyData = [
  { month: "Jan", income: 4200, expense: 2400 },
  { month: "Feb", income: 3800, expense: 2100 },
  { month: "Mar", income: 5200, expense: 3100 },
  { month: "Apr", income: 6100, expense: 2800 },
  { month: "May", income: 7300, expense: 3900 },
  { month: "Jun", income: 8400, expense: 4300 },
];

const categoryData = [
  { name: "Food", value: 35, color: "#8b5cf6" },
  { name: "Transport", value: 20, color: "#06b6d4" },
  { name: "Software", value: 25, color: "#22c55e" },
  { name: "Other", value: 20, color: "#f43f5e" },
];

export default function Analytics() {
  return (
    <div className="min-h-screen bg-[#050816] text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">
            Analytics Dashboard
          </h1>

          <p className="text-zinc-400">
            Advanced business intelligence overview
          </p>
        </div>

        {/* KPI CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400">Revenue</p>
              <TrendingUp className="text-green-400" />
            </div>

            <h2 className="text-3xl font-bold">$84,240</h2>

            <p className="text-green-400 mt-2 text-sm">
              +12.4% this month
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400">Expenses</p>
              <TrendingDown className="text-red-400" />
            </div>

            <h2 className="text-3xl font-bold">$32,120</h2>

            <p className="text-red-400 mt-2 text-sm">
              +4.3% this month
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400">Balance</p>
              <Wallet className="text-cyan-400" />
            </div>

            <h2 className="text-3xl font-bold">$52,120</h2>

            <p className="text-cyan-400 mt-2 text-sm">
              Healthy growth
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400">Transactions</p>
              <CreditCard className="text-purple-400" />
            </div>

            <h2 className="text-3xl font-bold">1,284</h2>

            <p className="text-purple-400 mt-2 text-sm">
              +18 new today
            </p>
          </motion.div>

        </div>

        {/* CHARTS */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* AREA CHART */}

          <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-6">
              Revenue Overview
            </h2>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#a1a1aa" />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                  />

                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHART */}

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-6">
              Expense Categories
            </h2>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BAR CHART */}

          <div className="xl:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-6">
              Financial Comparison
            </h2>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" stroke="#a1a1aa" />

                  <Tooltip />

                  <Bar
                    dataKey="income"
                    fill="#8b5cf6"
                    radius={[10, 10, 0, 0]}
                  />

                  <Bar
                    dataKey="expense"
                    fill="#06b6d4"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}