import { useState, useEffect } from 'react';
import { getCustomerNameById, getDistributorNameById, getSubserviceNameById, getStatusNameById } from '../utils/request';

interface EntityNames {
  customers: Record<string, string>;
  distributors: Record<string, string>;
  subservices: Record<string, string>;
  statuses: Record<string, string>;
}

export const useEntityNames = (requests: any[]) => {
  const [entityNames, setEntityNames] = useState<EntityNames>({
    customers: {},
    distributors: {},
    subservices: {},
    statuses: {},
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Solo ejecutar si hay requests y no están vacíos
    if (!requests || requests.length === 0) {
      setEntityNames({
        customers: {},
        distributors: {},
        subservices: {},
        statuses: {},
      });
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadNames = async () => {
      try {
        const newNames: EntityNames = {
          customers: {},
          distributors: {},
          subservices: {},
          statuses: {},
        };

        // Procesar solo los primeros 5 requests para evitar sobrecarga
        const requestsToProcess = requests.slice(0, 5);

        for (const request of requestsToProcess) {
          if (!isMounted) break;

          // Cliente
          if (request.relationships?.field_applicant?.data?.id) {
            const customerId = request.relationships.field_applicant.data.id;
            if (!newNames.customers[customerId]) {
              try {
                const name = await getCustomerNameById(customerId);
                if (isMounted) {
                  newNames.customers[customerId] = name;
                }
              } catch (error) {
                console.warn(`Error obteniendo cliente ${customerId}:`, error);
              }
            }
          }

          // Repartidor
          if (request.relationships?.field_distributor_data?.data?.id) {
            const distributorId = request.relationships.field_distributor_data.data.id;
            if (!newNames.distributors[distributorId]) {
              try {
                const name = await getDistributorNameById(distributorId);
                if (isMounted) {
                  newNames.distributors[distributorId] = name;
                }
              } catch (error) {
                console.warn(`Error obteniendo repartidor ${distributorId}:`, error);
              }
            }
          }

          // Subservicio
          if (request.relationships?.field_subservice?.data?.id) {
            const subserviceId = request.relationships.field_subservice.data.id;
            if (!newNames.subservices[subserviceId]) {
              try {
                const name = await getSubserviceNameById(subserviceId);
                if (isMounted) {
                  newNames.subservices[subserviceId] = name;
                }
              } catch (error) {
                console.warn(`Error obteniendo subservicio ${subserviceId}:`, error);
              }
            }
          }

          // Estado
          if (request.relationships?.field_application_statuses?.data?.id) {
            const statusId = request.relationships.field_application_statuses.data.id;
            if (!newNames.statuses[statusId]) {
              try {
                const name = await getStatusNameById(statusId);
                if (isMounted) {
                  newNames.statuses[statusId] = name;
                }
              } catch (error) {
                console.warn(`Error obteniendo estado ${statusId}:`, error);
              }
            }
          }
        }

        if (isMounted) {
          setEntityNames(newNames);
        }
      } catch (error) {
        console.error('Error loading entity names:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Usar un timeout pequeño para evitar llamadas inmediatas
    const timeoutId = setTimeout(() => {
      loadNames();
    }, 200);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [requests]);

  return { entityNames, isLoading };
};
