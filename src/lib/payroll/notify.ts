import { emailProvider } from "@/lib/email";

// "Each employee gets a digital payslip in their profile; optionally
// emailed" — sent once Finance marks the run approved-for-payment, since
// that's the point the numbers are truly final (HR approval alone can
// still be reversed by a Finance decline in principle, even though this
// build doesn't implement a decline path yet).
export async function notifyPayslipReady(params: {
  employeeWorkEmail: string;
  employeeName: string;
  period: string;
  netPay: number;
}): Promise<void> {
  await emailProvider.send({
    to: params.employeeWorkEmail,
    subject: `Your ${params.period} payslip is ready`,
    body: `Hi ${params.employeeName},\n\nYour payslip for ${params.period} has been finalized. Net pay: ${params.netPay.toFixed(2)}.\n\nView it in your MCI HR System profile under Payroll.`,
  });
}
