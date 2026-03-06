import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];

import { motion } from 'framer-motion';
import Skeleton from './Skeleton';

export default function Charts({ expenses, projects, formatMoney, darkMode, loading }) {
  // Spending by category
  const categoryData = useMemo(() => {
    if (loading) return [];
    const categoryMap = {};
    expenses.forEach(exp => {
      const project = projects.find(p => p.id === exp.projectId);
      const category = project?.category || 'Uncategorized';
      categoryMap[category] = (categoryMap[category] || 0) + (exp.totalPrice || 0);
    });
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, projects, loading]);

  // Spending by user
  const userData = useMemo(() => {
    if (loading) return [];
    const userMap = {};
    expenses.forEach(exp => {
      const userName = exp.userName || 'Unknown';
      userMap[userName] = (userMap[userName] || 0) + (exp.totalPrice || 0);
    });
    return Object.entries(userMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, loading]);

  // Spending by project
  const projectData = useMemo(() => {
    if (loading) return [];
    const projectMap = {};
    expenses.forEach(exp => {
      const project = projects.find(p => p.id === exp.projectId);
      const name = project?.name || 'Unknown';
      projectMap[name] = (projectMap[name] || 0) + (exp.totalPrice || 0);
    });
    return Object.entries(projectMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [expenses, projects, loading]);

  const totalSpending = useMemo(() => 
    expenses.reduce((sum, e) => sum + (e.totalPrice || 0), 0), 
  [expenses]);

  const textColor = darkMode ? '#e4e4e7' : '#18181b';
  const gridColor = darkMode ? '#3f3f46' : '#e4e4e7';

  if (!loading && expenses.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-400 italic">
        No expenses to analyze yet.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-900'} text-white`}>
          <Skeleton className="h-4 w-32 mb-2 opacity-20" />
          <Skeleton className="h-10 w-48 mb-2 opacity-20" />
          <Skeleton className="h-4 w-24 opacity-20" />
        </div>
        <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-100'} border`}>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </div>
        <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-100'} border`}>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="h-64 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-4/6" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Overview */}
      <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-900'} text-white`}>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Total Analyzed</h3>
        <p className="text-3xl font-bold tracking-tight">{formatMoney(totalSpending)}</p>
        <p className="text-sm text-zinc-500 mt-1">{expenses.length} transactions</p>
      </div>

      {/* Pie Chart - Category Distribution */}
      <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-100'} border`}>
        <h3 className={`font-bold mb-4 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Spending by Category</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(value)}
                contentStyle={{
                  backgroundColor: darkMode ? '#27272a' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                labelStyle={{ color: textColor }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - By Project */}
      <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-100'} border`}>
        <h3 className={`font-bold mb-4 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Top Projects</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fill: textColor, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: textColor, fontSize: 11 }} />
              <Tooltip
                formatter={(value) => formatMoney(value)}
                contentStyle={{
                  backgroundColor: darkMode ? '#27272a' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
              <Bar dataKey="value" fill={darkMode ? '#a1a1aa' : '#18181b'} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Breakdown */}
      {userData.length > 1 && (
        <div className={`rounded-2xl p-6 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-100'} border`}>
          <h3 className={`font-bold mb-4 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Spending by User</h3>
          <div className="space-y-3">
            {userData.map((user, idx) => (
              <div key={user.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{user.name}</span>
                </div>
                <span className={`font-semibold tabular-nums ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {formatMoney(user.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
