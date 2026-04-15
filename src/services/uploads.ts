import * as ImagePicker from 'expo-image-picker';

import { api } from './api';

export type UploadDocumentType = 'insurance' | 'id';

export type UploadDocumentAsset = {
  fileName: string;
  height: number;
  mimeType?: string | null;
  source: 'camera' | 'gallery';
  updatedAt: string;
  uri: string;
  width: number;
};

export type RemoteUploadResponse = {
  message: string;
  ok: boolean;
  upload: {
    documentType: UploadDocumentType;
    id: string | null;
    previewUrl: string | null;
    uploadedAt: string;
  };
};

type UploadPickerResult =
  | {
      status: 'success';
      asset: UploadDocumentAsset;
    }
  | {
      status: 'cancelled';
    }
  | {
      status: 'permission_denied';
      source: 'camera' | 'gallery';
    };

function buildAsset(
  source: 'camera' | 'gallery',
  asset: ImagePicker.ImagePickerAsset,
): UploadDocumentAsset {
  return {
    uri: asset.uri,
    fileName:
      asset.fileName ??
      `${source}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    source,
    updatedAt: new Date().toISOString(),
  };
}

export async function pickDocumentFromSource(
  source: 'camera' | 'gallery',
): Promise<UploadPickerResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return {
        status: 'permission_denied',
        source,
      };
    }
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return {
        status: 'permission_denied',
        source,
      };
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.85,
          cameraType: ImagePicker.CameraType.back,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.85,
          selectionLimit: 1,
        });

  if (result.canceled || !result.assets?.length) {
    return { status: 'cancelled' };
  }

  return {
    status: 'success',
    asset: buildAsset(source, result.assets[0]),
  };
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function normalizeUploadResponse(
  documentType: UploadDocumentType,
  raw: unknown,
): RemoteUploadResponse {
  const record = readRecord(raw) ?? {};
  const uploadRecord = readRecord(record.upload) ?? record;

  return {
    message:
      readString(record.message) ??
      `The ${documentType} document was uploaded successfully.`,
    ok: record.ok !== false,
    upload: {
      documentType,
      id:
        readString(uploadRecord.id) ??
        readString(uploadRecord.upload_id) ??
        readString(uploadRecord.uploadId),
      previewUrl:
        readString(uploadRecord.preview_url) ??
        readString(uploadRecord.previewUrl),
      uploadedAt:
        readString(uploadRecord.uploaded_at) ??
        readString(uploadRecord.uploadedAt) ??
        new Date().toISOString(),
    },
  };
}

export async function uploadDocumentToApi(
  documentType: UploadDocumentType,
  asset: UploadDocumentAsset,
  options: {
    draftId?: string | null;
    patientId?: number | null;
    visitId?: number | null;
  } = {},
) {
  const formData = new FormData();
  const fileType = asset.mimeType ?? 'image/jpeg';
  const fileName = asset.fileName || 'upload.jpg';
  const file = {
    name: fileName,
    type: fileType,
    uri: asset.uri,
  } as never;

  formData.append('file', file);
  formData.append(
    documentType === 'insurance' ? 'insurance_file' : 'id_file',
    file,
  );
  formData.append('source', asset.source);

  if (options.draftId) {
    formData.append('draft_id', options.draftId);
  }
  if (typeof options.patientId === 'number') {
    formData.append('patient_id', String(options.patientId));
  }
  if (typeof options.visitId === 'number') {
    formData.append('visit_id', String(options.visitId));
  }

  const response = await api.post<unknown>(
    documentType === 'insurance'
      ? '/api/uploads/insurance'
      : '/api/uploads/id',
    formData,
    {
      timeoutMs: 20000,
    },
  );

  return normalizeUploadResponse(documentType, response);
}
