// types.ts
export interface ProfileAttribute {
  drupal_internal__nid: number;
  drupal_internal__vid: number;
  langcode: string;
  revision_timestamp: string;
  status: boolean;
  title: string;
  created: string;
  changed: string;
  promote: boolean;
  sticky: boolean;
  default_langcode: boolean;
  revision_translation_affected: boolean;
  path: {
    alias: string | null;
    pid: number | null;
    langcode: string;
  };
  field_address: string;
  field_birth_date: string;
  field_department: string | null;
  field_document_number: string;
  field_full_name: string;
  field_id: string | null;
  field_mail: string;
  field_municipality_residence: string | null;
  field_phone_number: string;
  field_photo_document: File | null;
}

export interface RelationshipData {
  type: string;
  id: string;
  meta: {
    drupal_internal__target_id: number;
  };
}

export interface ProfileRelationships {
  node_type: {
    data: RelationshipData;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
  revision_uid: {
    data: RelationshipData;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
  uid: {
    data: RelationshipData;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
  field_gender: {
    data: RelationshipData;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
  field_parent_type: {
    data: RelationshipData | null;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
  field_type_document: {
    data: RelationshipData;
    links: {
      related: { href: string };
      self: { href: string };
    };
  };
}

export interface ProfileDataItem {
  type: string;
  id: string;
  links: {
    self: { href: string };
  };
  attributes: ProfileAttribute;
  relationships: ProfileRelationships;
}

export interface ProfileApiResponse {
  jsonapi: {
    version: string;
    meta: {
      links: {
        self: { href: string };
      };
    };
  };
  data: ProfileDataItem[];
  meta: {
    count: number;
    omitted?: {
      detail: string;
      links: {
        help: { href: string };
        [key: string]: any;
      };
    };
  };
  links: {
    self: { href: string };
  };
}

// Simplified Customer type for UI components
export interface Customer {
  id: string;
  fullName: string;
  documentType: string; // This will be the label, e.g., "Cédula de Ciudadanía"
  documentNumber: string;
  phoneNumber: string;
  email: string;
  department: string;
  municipality: string;
  address: string;
  photo_document: File | null;
  attachments?: Attachment[];
}

export type FormMode = "create" | "view" | "edit";

export interface CustomerFormValues {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phoneNumber: string;
  email?: string;
  department: string;
  municipality: string;
  address: string;
  photo_document?: File | null;
}

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}
