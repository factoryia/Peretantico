import type { DeliveryDriver } from "@/features/distributors/types";
import { Cog, FileText, MessageSquare, Truck, User } from "lucide-react";

// Datos de navegación
export const data = {
  navMain: [
    {
      title: "Solicitudes",
      url: "/",
      icon: MessageSquare,
      isActive: true,
    },
    {
      title: "Repartidores",
      url: "/repartidores",
      icon: Truck,
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: FileText,
    },
    {
      title: "Configración",
      url: "/configuraciones",
      icon: Cog,
    },
    {
      title: "Clientes",
      url: "/clientes",
      icon: User,
    },
  ],
};

export const initialRepartidores: DeliveryDriver[] = [
  {
    id: 1,
    nombre: "Carlos Ruiz",
    identificacion: "98765432",
    telefono: "3201234567",
    email: "carlos@peretantico.com",
    zona: "Norte",
    vehiculo: "Motocicleta",
    placa: "ABC123",
    estado: "Disponible",
  },
  {
    id: 2,
    nombre: "Ana López",
    identificacion: "12344321",
    telefono: "3109876543",
    email: "ana@peretantico.com",
    zona: "Centro",
    vehiculo: "Bicicleta",
    placa: "",
    estado: "Ocupado",
  },
  {
    id: 3,
    nombre: "Pedro Sánchez",
    identificacion: "55667788",
    telefono: "3156677889",
    email: "pedro@peretantico.com",
    zona: "Sur",
    vehiculo: "Motocicleta",
    placa: "XYZ789",
    estado: "Disponible",
  },
];
