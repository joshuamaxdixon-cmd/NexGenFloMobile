import { api } from './api';
import type { IntakeFormData } from './intake';
import type { UploadDocumentAsset, UploadDocumentType } from './uploads';

export type DocumentScanType = UploadDocumentType;

export type DocumentScanResult = {
  confidence: Partial<Record<keyof IntakeFormData, number>>;
  documentType: DocumentScanType;
  extractedFields: Partial<IntakeFormData>;
  requiresConfirmation: boolean;
  warnings: string[];
};

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : null;
}

const ALLOWED_FIELDS = [
  'patientType',
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'emergencyContactName',
  'emergencyContactPhone',
  'heightFt',
  'heightIn',
  'weightLb',
  'phoneNumber',
  'email',
  'chiefConcern',
  'symptomDuration',
  'painLevel',
  'symptomNotes',
  'medications',
  'pharmacy',
  'medicalConditions',
  'allergies',
  'allergyReaction',
  'allergyNotes',
  'insuranceProvider',
  'memberId',
  'groupNumber',
  'subscriberName',
] as const satisfies readonly (keyof IntakeFormData)[];

function normalizeExtractedFields(value: unknown) {
  const record = readRecord(value) ?? {};
  const extractedFields: Partial<IntakeFormData> = {};

  for (const fieldName of ALLOWED_FIELDS) {
    const rawValue = record[fieldName];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      extractedFields[fieldName] = rawValue.trim();
    }
  }

  return extractedFields;
}

function normalizeConfidence(value: unknown) {
  const record = readRecord(value) ?? {};
  const confidence: Partial<Record<keyof IntakeFormData, number>> = {};

  for (const fieldName of ALLOWED_FIELDS) {
    const rawValue = readNumber(record[fieldName]);
    if (typeof rawValue === 'number') {
      confidence[fieldName] = rawValue;
    }
  }

  return confidence;
}

function normalizeScanResponse(raw: unknown): DocumentScanResult {
  const record = readRecord(raw) ?? {};
  const warningsValue = Array.isArray(record.warnings) ? record.warnings : [];

  return {
    confidence: normalizeConfidence(record.confidence),
    documentType:
      readString(record.document_type ?? record.documentType) === 'insurance'
        ? 'insurance'
        : 'id',
    extractedFields: normalizeExtractedFields(
      record.extracted_fields ?? record.extractedFields,
    ),
    requiresConfirmation: record.requires_confirmation !== false,
    warnings: warningsValue.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    ),
  };
}

export async function scanDocumentWithTextract(
  documentType: DocumentScanType,
  asset: UploadDocumentAsset,
) {
  const formData = new FormData();
  formData.append(
    'file',
    {
      name: asset.fileName || 'scan.jpg',
      type: asset.mimeType ?? 'image/jpeg',
      uri: asset.uri,
    } as never,
  );
  formData.append('type', documentType);

  const response = await api.post<unknown>('/intake/scan-document', formData, {
    timeoutMs: 45000,
  });

  return normalizeScanResponse(response);
}
