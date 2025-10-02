// types/index.ts
export interface Distributor {
  id: string;
  status: boolean;
  title: string;
  currentAvailability: boolean;
  documentNumber: string;
  entryDate: string;
  vehicleId: string;
  email: string;
  observations: string | null;
  phoneNumber: string;
  documentType: {
    id: string;
    name: string;
  };
  coverageArea: {
    id: string;
    name: string;
  };
  transportationType: {
    id: string;
    name: string;
  };
}

export interface Request {
  id: string;
  title: string;
  applicationNumber: string;
  status: string;
  entryDate: string;
  estimatedApplicationHour: number;
  logisticsCosts: number;
  serviceValue: number;
  applicant: {
    id: string;
    fullName: string;
    documentNumber: string;
    phoneNumber: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
  };
  subservice: {
    id: string;
    name: string;
  };
  distributor?: {
    id: string;
    title: string;
  };
  paymentStatus?: {
    id: string;
    name: string;
  };
}

export interface PaymentCalculation {
  baseValue: number;
  additionalValue: number;
  discountValue: number;
  total: number;
}

export interface CostRecord {
  id: string;
  distributorId: string;
  requestId: string;
  requestApplicationNumber?: string;
  paymentCalculation: PaymentCalculation;
  paymentStatus?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DistributorWithRequests extends Distributor {
  assignedRequests: Request[];
}

export interface CostFormData {
  distributorId: string;
  requestId: string;
  baseValue: number;
  additionalValue: number;
  discountValue: number;
  observations?: string;
}
