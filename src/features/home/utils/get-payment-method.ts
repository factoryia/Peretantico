// import api from "@/api";

// type UUID = string;

// type JsonApiResponse<T> = {
//   data: T[];
//   included?: any[];
//   meta?: { count?: number };
//   links?: {
//     next?: { href: string };
//     last?: { href: string };
//     self?: { href: string };
//   };
// };

// type PaymentResource = {
//   type: "node--payment";
//   id: UUID;
//   attributes: {
//     title: string;
//     field_additional_amount: number | null;
//     field_discount_amount: number | null;
//     field_entry_date: string | null;
//     field_observations: string | null;
//     field_service_value: number | null;
//     field_total_amount: number | null;
//   };
//   relationships?: {
//     field_payment_method?: {
//       data: { type: "taxonomy_term--payment_method"; id: UUID } | null;
//     };
//     field_distributor_data?: {
//       data: { type: "node--distributor"; id: UUID } | null;
//     };
//     field_request?: { data: Array<{ type: "node--request"; id: UUID }> | null };
//   };
// };

// type PaymentMethodResource = {
//   type: "taxonomy_term--payment_method";
//   id: UUID;
//   attributes: {
//     name: string;
//     description: string | null;
//     drupal_internal__revision_id: number;
//   };
// };

// type DistributorResource = {
//   type: "node--distributor";
//   id: UUID;
//   attributes: {
//     title: string;
//     field_document_number: string | null;
//     field_entry_date: string | null;
//     field_id_vehicle: string | null;
//     field_mail: string | null;
//     field_observations: string | null;
//     field_phone_number: string | null;
//   };
// };

// export type PaymentDTO = {
//   id: UUID;
//   title: string;
//   field_additional_amount: number | null;
//   field_discount_amount: number | null;
//   field_entry_date: string | null;
//   field_observations: string | null;
//   field_service_value: number | null;
//   field_total_amount: number | null;
//   field_payment_method: {
//     id: UUID;
//     name: string;
//     description: string | null;
//     drupal_internal__revision_id: number;
//   } | null;
//   field_distributor_data: {
//     id: UUID;
//     title: string;
//     field_document_number: string | null;
//     field_entry_date: string | null;
//     field_id_vehicle: string | null;
//     field_mail: string | null;
//     field_observations: string | null;
//     field_phone_number: string | null;
//   } | null;
// };

// function buildIncludedIndex(included: any[] | undefined) {
//   const map = new Map<string, any>();
//   for (const item of included ?? []) map.set(`${item.type}:${item.id}`, item);
//   return map;
// }

// function buildUrl(
//   requestUuid: string,
//   opts?: { limit?: number; offset?: number }
// ) {
//   const limit = opts?.limit ?? 50;
//   const offset = opts?.offset ?? 0;

//   const qs = new URLSearchParams();

//   // ✅ Solo pagos donde field_payment_method NO sea null
//   qs.set(
//     "filter[payment_method_not_null][condition][path]",
//     "field_payment_method"
//   );
//   qs.set("filter[payment_method_not_null][condition][operator]", "IS NOT NULL");

//   // ✅ Filtrar por relación field_request (UUID del node--request)
//   qs.set("filter[request_match][condition][path]", "field_request.id");
//   qs.set("filter[request_match][condition][operator]", "=");
//   qs.set("filter[request_match][condition][value]", requestUuid);

//   // ✅ Traer relaciones en el mismo request
//   qs.set("include", "field_payment_method,field_distributor_data");

//   // Paginación
//   qs.set("page[limit]", String(limit));
//   qs.set("page[offset]", String(offset));

//   // (Opcional) reducir payload
//   qs.set(
//     "fields[node--payment]",
//     [
//       "title",
//       "field_additional_amount",
//       "field_discount_amount",
//       "field_entry_date",
//       "field_observations",
//       "field_service_value",
//       "field_total_amount",
//       "field_payment_method",
//       "field_distributor_data",
//       "field_request",
//     ].join(",")
//   );
//   qs.set(
//     "fields[taxonomy_term--payment_method]",
//     ["name", "description", "drupal_internal__revision_id"].join(",")
//   );
//   qs.set(
//     "fields[node--distributor]",
//     [
//       "title",
//       "field_document_number",
//       "field_entry_date",
//       "field_id_vehicle",
//       "field_mail",
//       "field_observations",
//       "field_phone_number",
//     ].join(",")
//   );

//   return `/api/node/payment?${qs.toString()}`;
// }

// /**
//  * Obtiene pagos filtrando por el UUID del node--request (relación field_request)
//  *
//  * @param requestUuid UUID del request en JSON:API (ej: "f0d4eb58-fe0f-4248-8de2-e204b8f0698d")
//  * @param opts.limit Tamaño de página (default 50)
//  * @param opts.maxPages Límite de páginas a traer (seguridad) (default 20)
//  */
// export async function fetchPaymentsByRequest(
//   requestUuid: string,
//   opts?: { limit?: number; maxPages?: number }
// ): Promise<{ items: PaymentDTO[]; total?: number }> {
//   const limit = opts?.limit ?? 50;
//   const maxPages = opts?.maxPages ?? 20;

//   const items: PaymentDTO[] = [];
//   let offset = 0;
//   let total: number | undefined;

//   for (let page = 0; page < maxPages; page++) {
//     const url = buildUrl(requestUuid, { limit, offset });
//     const { data } = await api.get<JsonApiResponse<PaymentResource>>(url);

//     if (typeof data?.meta?.count === "number") total = data.meta.count;

//     const includedIndex = buildIncludedIndex(data.included);

//     for (const p of data.data ?? []) {
//       const paymentMethodRel =
//         p.relationships?.field_payment_method?.data ?? null;
//       const distributorRel =
//         p.relationships?.field_distributor_data?.data ?? null;

//       const pm = paymentMethodRel
//         ? (includedIndex.get(
//             `${paymentMethodRel.type}:${paymentMethodRel.id}`
//           ) as PaymentMethodResource | undefined)
//         : undefined;

//       const dist = distributorRel
//         ? (includedIndex.get(`${distributorRel.type}:${distributorRel.id}`) as
//             | DistributorResource
//             | undefined)
//         : undefined;

//       items.push({
//         id: p.id,
//         title: p.attributes.title,
//         field_additional_amount: p.attributes.field_additional_amount ?? null,
//         field_discount_amount: p.attributes.field_discount_amount ?? null,
//         field_entry_date: p.attributes.field_entry_date ?? null,
//         field_observations: p.attributes.field_observations ?? null,
//         field_service_value: p.attributes.field_service_value ?? null,
//         field_total_amount: p.attributes.field_total_amount ?? null,
//         field_payment_method: pm
//           ? {
//               id: pm.id,
//               name: pm.attributes.name,
//               description: pm.attributes.description ?? null,
//               drupal_internal__revision_id:
//                 pm.attributes.drupal_internal__revision_id,
//             }
//           : null,
//         field_distributor_data: dist
//           ? {
//               id: dist.id,
//               title: dist.attributes.title,
//               field_document_number:
//                 dist.attributes.field_document_number ?? null,
//               field_entry_date: dist.attributes.field_entry_date ?? null,
//               field_id_vehicle: dist.attributes.field_id_vehicle ?? null,
//               field_mail: dist.attributes.field_mail ?? null,
//               field_observations: dist.attributes.field_observations ?? null,
//               field_phone_number: dist.attributes.field_phone_number ?? null,
//             }
//           : null,
//       });
//     }

//     // no más páginas
//     if (!data.links?.next?.href || (data.data?.length ?? 0) < limit) break;
//     offset += limit;
//   }

//   return { items, total };
// }

import api from "@/api";

type UUID = string;

type JsonApiResponse<T> = {
  data: T[];
  included?: any[];
};

type PaymentResource = {
  type: "node--payment";
  id: UUID;
  attributes: {
    title: string;
    field_additional_amount: number | null;
    field_discount_amount: number | null;
    field_entry_date: string | null;
    field_observations: string | null;
    field_service_value: number | null;
    field_total_amount: number | null;
  };
  relationships?: {
    field_payment_method?: {
      data: { type: "taxonomy_term--payment_method"; id: UUID } | null;
    };
    field_distributor_data?: {
      data: { type: "node--distributor"; id: UUID } | null;
    };
  };
};

type PaymentMethodResource = {
  type: "taxonomy_term--payment_method";
  id: UUID;
  attributes: {
    name: string;
    description: string | null;
    drupal_internal__revision_id: number;
  };
};

type DistributorResource = {
  type: "node--distributor";
  id: UUID;
  attributes: {
    title: string;
    field_document_number: string | null;
    field_entry_date: string | null;
    field_id_vehicle: string | null;
    field_mail: string | null;
    field_observations: string | null;
    field_phone_number: string | null;
  };
};

export type PaymentDTO = {
  id: UUID;
  title: string;
  field_additional_amount: number | null;
  field_discount_amount: number | null;
  field_entry_date: string | null;
  field_observations: string | null;
  field_service_value: number | null;
  field_total_amount: number | null;
  field_payment_method: {
    id: UUID;
    name: string;
    description: string | null;
    drupal_internal__revision_id: number;
  } | null;
  field_distributor_data: {
    id: UUID;
    title: string;
    field_document_number: string | null;
    field_entry_date: string | null;
    field_id_vehicle: string | null;
    field_mail: string | null;
    field_observations: string | null;
    field_phone_number: string | null;
  } | null;
};

function buildIncludedIndex(included?: any[]) {
  const map = new Map<string, any>();
  for (const item of included ?? []) map.set(`${item.type}:${item.id}`, item);
  return map;
}

function buildUrl(requestUuid: string) {
  const qs = new URLSearchParams();

  // ✅ Solo pagos donde field_payment_method NO sea null
  qs.set(
    "filter[payment_method_not_null][condition][path]",
    "field_payment_method"
  );
  qs.set("filter[payment_method_not_null][condition][operator]", "IS NOT NULL");

  // ✅ Filtrar por relación field_request (UUID del node--request)
  qs.set("filter[request_match][condition][path]", "field_request.id");
  qs.set("filter[request_match][condition][operator]", "=");
  qs.set("filter[request_match][condition][value]", requestUuid);

  // ✅ Incluir relaciones para resolverlas desde "included"
  qs.set("include", "field_payment_method,field_distributor_data");

  // ✅ Solo 1 resultado
  qs.set("page[limit]", "1");

  // (Opcional) reducir payload
  qs.set(
    "fields[node--payment]",
    [
      "title",
      "field_additional_amount",
      "field_discount_amount",
      "field_entry_date",
      "field_observations",
      "field_service_value",
      "field_total_amount",
      "field_payment_method",
      "field_distributor_data",
      "field_request",
    ].join(",")
  );
  qs.set(
    "fields[taxonomy_term--payment_method]",
    ["name", "description", "drupal_internal__revision_id"].join(",")
  );
  qs.set(
    "fields[node--distributor]",
    [
      "title",
      "field_document_number",
      "field_entry_date",
      "field_id_vehicle",
      "field_mail",
      "field_observations",
      "field_phone_number",
    ].join(",")
  );

  return `/api/node/payment?${qs.toString()}`;
}

/**
 * Retorna el pago (único) asociado a una solicitud.
 *
 * @param requestUuid UUID del node--request (field_request)
 */
export async function fetchPaymentByRequest(
  requestUuid: string
): Promise<PaymentDTO | null> {
  const url = buildUrl(requestUuid);

  const { data } = await api.get<JsonApiResponse<PaymentResource>>(url);

  const payment = data.data?.[0];
  if (!payment) return null;

  const includedIndex = buildIncludedIndex(data.included);

  const pmRel = payment.relationships?.field_payment_method?.data ?? null;
  const distRel = payment.relationships?.field_distributor_data?.data ?? null;

  const pm = pmRel
    ? (includedIndex.get(`${pmRel.type}:${pmRel.id}`) as
        | PaymentMethodResource
        | undefined)
    : undefined;

  const dist = distRel
    ? (includedIndex.get(`${distRel.type}:${distRel.id}`) as
        | DistributorResource
        | undefined)
    : undefined;

  return {
    id: payment.id,
    title: payment.attributes.title,
    field_additional_amount: payment.attributes.field_additional_amount ?? null,
    field_discount_amount: payment.attributes.field_discount_amount ?? null,
    field_entry_date: payment.attributes.field_entry_date ?? null,
    field_observations: payment.attributes.field_observations ?? null,
    field_service_value: payment.attributes.field_service_value ?? null,
    field_total_amount: payment.attributes.field_total_amount ?? null,
    field_payment_method: pm
      ? {
          id: pm.id,
          name: pm.attributes.name,
          description: pm.attributes.description ?? null,
          drupal_internal__revision_id:
            pm.attributes.drupal_internal__revision_id,
        }
      : null,
    field_distributor_data: dist
      ? {
          id: dist.id,
          title: dist.attributes.title,
          field_document_number: dist.attributes.field_document_number ?? null,
          field_entry_date: dist.attributes.field_entry_date ?? null,
          field_id_vehicle: dist.attributes.field_id_vehicle ?? null,
          field_mail: dist.attributes.field_mail ?? null,
          field_observations: dist.attributes.field_observations ?? null,
          field_phone_number: dist.attributes.field_phone_number ?? null,
        }
      : null,
  };
}
