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
  created: string;
  applicationNumber: string;
  status: string;
  entryDate: string;
  estimatedApplicationHour?: string | null;
  estimatedPrioritizedHour?: string | null;
  isRecurring?: boolean;
  logisticsCosts: number;
  serviceValue: number;
  prioritizedValue?: number;
  applicationScore?: number;
  applicant: {
    id: string;
    fullName: string;
    documentNumber?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
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
  infoServiceType?: string;
  applicationStatus?: {
    id: string;
    name: string;
  };
  paymentStatus?: {
    id: string;
    name: string;
  };
  serviceStatus?: {
    id: string;
    name: string;
  };
  field_service_value?: number;
  field_prioritized_value?: number;
}

export interface DistributorWithRequests extends Distributor {
  assignedRequests: Request[];
}
