import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FetchDistributorsParams } from "../types/distributors";

interface UseDistributorsQueryProps extends FetchDistributorsParams {}

export const useDistributorsQuery = ({
  coverageAreaId,
  status,
  fullName,
  search,
  paymentStatus,
  documentNumber,
  transportationTypeId,
  documentType,
  page = 1,
  limit = 10,
}: UseDistributorsQueryProps) => {
  const args = {
    coverageAreaId: coverageAreaId && coverageAreaId !== "all" ? (coverageAreaId as Id<"coverageAreas">) : undefined,
    status: status !== undefined ? status : undefined,
    // search: documentNumber || undefined, // Client-side filtering
    transportationTypeId: transportationTypeId && transportationTypeId !== "all" ? (transportationTypeId as Id<"transportationTypes">) : undefined,
  };

  const results = useQuery(api.distributors.listAll, args);

  // Client-side filtering and pagination
  let filteredResults = results || [];

  if (fullName) {
    filteredResults = filteredResults.filter((d) => 
      d.title.toLowerCase().includes(fullName.toLowerCase())
    );
  }

  if (documentNumber) {
    filteredResults = filteredResults.filter((d) => 
      d.documentNumber.toLowerCase().includes(documentNumber.toLowerCase())
    );
  }

  if (documentType && documentType !== "all") {
    filteredResults = filteredResults.filter((d) => d.documentType === documentType);
  }

  if (search) {
    filteredResults = filteredResults.filter((d) => 
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.documentNumber.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (paymentStatus && paymentStatus !== "all") {
    filteredResults = filteredResults.filter((d) => d.paymentStatus === paymentStatus);
  }

  const totalCount = filteredResults.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginatedData = filteredResults.slice((page - 1) * limit, page * limit);

  // Map to Distributor interface
  const distributors = paginatedData.map((d) => ({
    id: d._id,
    status: d.status,
    title: d.title,
    currentAvailability: d.currentAvailability,
    documentNumber: d.documentNumber,
    entryDate: new Date(d.entryDate).toISOString().split('T')[0], // YYYY-MM-DD
    vehicleId: d.vehicleId || null,
    email: d.email || null,
    observations: d.observations || null,
    phoneNumber: d.phoneNumber,
    documentType: { id: d.documentType, name: d.documentType },
    coverageArea: d.coverageArea ? { id: d.coverageArea._id, name: d.coverageArea.name } : { id: "", name: "" },
    transportationType: d.transportationType ? { id: d.transportationType._id, name: d.transportationType.name } : { id: "", name: "" },
    paymentStatus: d.paymentStatus,
  }));

  return {
    data: {
      distributors,
      totalPages,
    },
    isLoading: results === undefined,
  };
};
