'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { MonthlyRevenueTrend } from '@/services/dashboard.service';
import { TrendingUp, ArrowUpRight, TrendingDown } from 'lucide-react';

interface RevenueTrendChartProps {
  data: MonthlyRevenueTrend[];
}

function formatCurrencyCompact(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)}Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(0)}k`;
  }
  return `₹${val}`;
}

function formatINR(val: number): string {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
    const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
    const profit = revenue - expenses;

    return (
      <div className="bg-popover border border-border/80 shadow-lg rounded-xl p-3 text-xs space-y-1.5 min-w-[170px]">
        <p className="font-semibold text-foreground border-b border-border pb-1">
          {label}
        </p>
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Revenue:
          </span>
          <span>{formatINR(revenue)}</span>
        </div>
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Expenses:
          </span>
          <span>{formatINR(expenses)}</span>
        </div>
        <div className="border-t border-border pt-1 flex items-center justify-between font-bold text-foreground">
          <span>Net Margin:</span>
          <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {formatINR(profit)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalRevenueInPeriod = data.reduce((acc, cur) => acc + cur.revenue, 0);
  const totalExpensesInPeriod = data.reduce((acc, cur) => acc + cur.expenses, 0);
  const totalProfitInPeriod = totalRevenueInPeriod - totalExpensesInPeriod;

  if (!isMounted) {
    return (
      <div className="h-[320px] w-full flex items-center justify-center bg-muted/10 rounded-xl border border-dashed text-muted-foreground text-sm">
        Loading financial analytics...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mini Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b pb-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground block text-[11px]">6-Month Revenue</span>
            <span className="font-bold text-sm text-foreground">
              {formatINR(totalRevenueInPeriod)}
            </span>
          </div>
          <div className="border-l pl-4">
            <span className="text-muted-foreground block text-[11px]">6-Month Expenses</span>
            <span className="font-bold text-sm text-rose-600">
              {formatINR(totalExpensesInPeriod)}
            </span>
          </div>
          <div className="border-l pl-4">
            <span className="text-muted-foreground block text-[11px]">Net Studio Profit</span>
            <span
              className={`font-bold text-sm ${
                totalProfitInPeriod >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatINR(totalProfitInPeriod)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Operating Revenue</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 font-medium text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Expenses & Payouts</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis
              dataKey="shortMonth"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revenueGradient)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
