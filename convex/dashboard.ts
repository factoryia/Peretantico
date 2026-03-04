import { query } from "./_generated/server";

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();
    const distributors = await ctx.db.query("distributors").collect();
    const services = await ctx.db.query("services").collect();
    const payments = await ctx.db.query("payments").collect();

    const requestsByStatus = {
      Atendida: 0,
      EnProceso: 0,
      Finalizada: 0,
      Incompleta: 0,
    };

    requests.forEach((req) => {
      const status = req.requestStatus as keyof typeof requestsByStatus;
      if (requestsByStatus[status] !== undefined) {
        requestsByStatus[status]++;
      }
    });

    const totalPaymentsAmount = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    return {
      totalRequests: requests.length,
      requestsByStatus,
      totalDistributors: distributors.length,
      totalServices: services.length,
      totalPayments: payments.length,
      totalPaymentsAmount: totalPaymentsAmount.toString(),
    };
  },
});
