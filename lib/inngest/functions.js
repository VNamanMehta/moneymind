import { sendEmail } from "@/actions/send-email";
import { db } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { date } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const checkBudgetAlert = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-buget", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });
    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue;

      await step.run(`check-budget-${budget.id}`, async () => {
        const currentDate = new Date();
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const endOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentUsed = (totalExpenses / budgetAmount) * 100;

        if (
          percentUsed > 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          // Send Email to user
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              username: budget.user.name,
              type: "budget-alert",
              data: {
                percentUsed,
                budgetAmount: parseInt(budgetAmount).toFixed(2),
                totalExpenses: parseInt(totalExpenses).toFixed(2),
                accountName: defaultAccount.name,
              },
            }),
          });

          // Update lastAlertSent
          await db.budget.update({
            where: {
              id: budget.id,
            },
            data: {
              lastAlertSent: new Date(),
            },
          });
        }
      });
    }
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions", // step name
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    // 1. Fetch all recurring transactions that are due
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions", //step name
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessed: null }, // First time
              { nextRecurringDate: { lte: new Date() } }, // Due
            ],
          },
        });
      }
    );
    // 2. Create events for each recurring transaction
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process", // Event name (fixed format -> category.action.details)
        data: { transactionId: transaction.id, userId: transaction.userId },
      }));
      // 3. Send events to Inngest
      await inngest.send(events);

      return { triggered: recurringTransactions.length };
    }
  }
);
// Event handler - by using event batching and throttling
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    throttle: {
      limit: 10, // 10 events per minute (process only 10 transactions at a time for the given duration)
      period: "1m", // 10 events per minute
      key: "event.data.userId", // Throttle based on userId (for each user with recurring transactions)
      //  (event.data is naming convention - refers to the data for a given event , userId is the data sent to Inngest)
    },
  },
  {
    event: "transaction.recurring.process",
  },
  async ({ event, step }) => {
    // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: { id: event.data.transactionId, userId: event.data.userId },
        include: { account: true },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        // Create a new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });
        // Update the balance
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // Update the last processed date and next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        });
      });
    });
  }
);

function isTransactionDue(transaction) {
  // If there is no last processed date then, transaction is due
  if (!transaction.lastProcessed) return true; // First time
  const today = new Date();
  const nextDue = new Date(transaction.nextRecurringDate);

  // Compare next due date with today's date

  return nextDue <= today;
}

function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;

    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;

    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;

    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: {
          accounts: true,
        },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });

        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            username: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }
    return { processed: users.length };
  }
);

async function generateFinancialInsights(stats, month) {
  const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: $${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]`;

  try {
    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating insights", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting aside some money for savings or investments.",
      "You're doing great! Keep up the good work!",
    ];
  }
}

const getMonthlyStats = async (userId, month) => {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      // accumulator and transaction
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount; // category wise expenses (group by category) eg: {food: 100, rent: 200}
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      // initial value (stats) for accumulator
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
};
