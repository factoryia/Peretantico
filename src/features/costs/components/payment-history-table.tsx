"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Payment } from "../utils/costs";
import { History, ReceiptText } from "lucide-react";

interface PaymentHistoryTableProps {
  payments: Payment[];
}

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const formatCurrency = (value: number | undefined) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
          <History className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Historial de Pagos Realizados</h3>
      </div>
      
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <Table className="w-full min-w-[800px]">
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-transparent border-b border-gray-100">
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                ID Pago
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Fecha
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Concepto
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6 text-right">
                Valor Total
              </TableHead>
              <TableHead className="text-center font-bold text-[11px] uppercase tracking-wider text-slate-500 py-4 px-6">
                Estado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground italic bg-slate-50/30"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ReceiptText className="h-8 w-8 text-slate-200" />
                    <span>No hay registros de pagos previos para este repartidor.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="hover:bg-slate-50/50 transition-colors border-b border-gray-50 even:bg-slate-50/20"
                >
                  <TableCell className="font-medium text-gray-900 py-4 px-6 text-[13px]">
                    {payment.id.split("-").pop()?.toUpperCase() || payment.id}
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium py-4 px-6 text-sm">
                    {payment.createdAt
                      ? format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium py-4 px-6 text-sm max-w-[300px] truncate">
                    {payment.title || payment.observations || "Pago de servicios"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 py-4 px-6 text-sm">
                    {formatCurrency(payment.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center py-4 px-6">
                    <Badge
                      variant="outline"
                      className={`rounded-full shadow-none font-bold text-[10px] uppercase tracking-wider px-3 ${
                        payment.status === "Pagado"
                          ? "bg-green-100 text-green-700 border-none"
                          : "bg-amber-100 text-amber-700 border-none"
                      }`}
                    >
                      {payment.status || "Pagado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
