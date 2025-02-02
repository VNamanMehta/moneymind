"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATE_RANGES = {
  "7D": { label: "Last 7 Days", days: 7 },
  "1M": { label: "Last 1 Month", days: 30 },
  "3M": { label: "Last 3 Months", days: 92 },
  "6M": { label: "Last 6 Months", days: 184 },
  ALL: { label: "All Time", days: null },
};

const AccountChart = ({ transactions }) => {
  const [dateRange, setDateRange] = useState("1M");

  const filteredData = useMemo(() => {
    const range = DATE_RANGES[dateRange];
    const now = new Date();

    const startDate = range.days
      ? startOfDay(subDays(now, range.days))
      : startOfDay(new Date(0));

    // Filter transactions by date
    const filteredTransactions = transactions.filter(
      (t) => new Date(t.date) >= startDate && new Date(t.date) <= endOfDay(now)
    );

    // Group transactions by date
    const groupedTransactions = filteredTransactions.reduce((acc, t) => {
      const date = format(new Date(t.date), "yyyy/MMM/dd");
      const displayDate = format(new Date(t.date), "MMM dd");

      if (!acc[date]) {
        acc[date] = {
          date: displayDate,
          fullDate: new Date(t.date),
          income: 0,
          expense: 0,
        };
      }

      if (t.type === "INCOME") {
        acc[date].income += t.amount;
      } else {
        acc[date].expense += t.amount;
      }

      return acc;
    }, {});

    return Object.values(groupedTransactions).sort(
      (a, b) => a.fullDate - b.fullDate
    );
  }, [transactions, dateRange]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, day) => ({
        income: acc.income + day.income,
        expense: acc.expense + day.expense,
      }),
      { income: 0, expense: 0 }
    );
  }, [filteredData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-base font-normal">
          Transaction Overview
        </CardTitle>
        <Select defaultValue={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select Range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGES).map(([key, { label }]) => {
              return (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div>
          <div className="text-center">
            <p className=" text-muted-foreground">Total Income</p>
            <p className=" text-lg font-bold text-green-500">
              ${totals.income.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className=" text-muted-foreground">Total Expenses</p>
            <p className=" text-lg font-bold text-red-500">
              ${totals.expense.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className=" text-muted-foreground">Net</p>
            <p
              className={`text-lg font-bold ${
                totals.income - totals.expense < 0
                  ? "text-red-500"
                  : "text-green-500"
              }`}
            >
              ${(totals.income - totals.expense).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value) => [`$${value}`, undefined]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "2px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar
                dataKey="income"
                name="income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountChart;
