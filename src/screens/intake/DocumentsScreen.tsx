import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { InfoCard } from '../../components/InfoCard';
import { InputField } from '../../components/InputField';
import { SecondaryButton } from '../../components/SecondaryButton';
import {
  pickDocumentFromSource,
  type UploadDocumentAsset,
  type UploadDocumentType,
  useDraftStore,
} from '../../services';
import { colors, spacing, typography } from '../../theme';
import type { IntakeStepComponentProps } from './types';

function getUploadStatusLabel(
  remoteStatus: 'error' | 'idle' | 'uploaded' | 'uploading',
) {
  switch (remoteStatus) {
    case 'uploaded':
      return 'On file';
    case 'uploading':
      return 'Uploading...';
    case 'error':
      return 'Needs retry';
    default:
      return 'Optional';
  }
}

function DocumentPreview({
  asset,
  icon,
}: {
  asset: UploadDocumentAsset | null;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  if (asset) {
    return (
      <View style={styles.uploadSurface}>
        <Image
          contentFit="cover"
          source={{ uri: asset.uri }}
          style={styles.previewImage}
        />
      </View>
    );
  }

  return (
    <View style={[styles.uploadSurface, styles.uploadSurfaceEmpty]}>
      <Ionicons color={colors.primaryDeep} name={icon} size={30} />
      <Text style={styles.uploadSurfaceText}>Tap to add photo</Text>
    </View>
  );
}

function UploadDocumentCard({
  asset,
  busyAction,
  documentType,
  errorMessage,
  onPick,
  remoteStatus,
}: {
  asset: UploadDocumentAsset | null;
  busyAction: string | null;
  documentType: UploadDocumentType;
  errorMessage: string | null;
  onPick: (
    documentType: UploadDocumentType,
    source: 'camera' | 'gallery',
  ) => Promise<void>;
  remoteStatus: 'error' | 'idle' | 'uploaded' | 'uploading';
}) {
  const statusLabel = getUploadStatusLabel(remoteStatus);

  return (
    <View style={styles.uploadBlock}>
      <View style={styles.uploadHeaderRow}>
        <View />
        <View
          style={[
            styles.statusPill,
            remoteStatus === 'uploaded'
              ? styles.statusPillSuccess
              : remoteStatus === 'error'
                ? styles.statusPillWarning
                : null,
          ]}
        >
          <Text
            style={[
              styles.statusPillLabel,
              remoteStatus === 'uploaded'
                ? styles.statusPillLabelSuccess
                : remoteStatus === 'error'
                  ? styles.statusPillLabelWarning
                  : null,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <DocumentPreview
        asset={asset}
        icon={documentType === 'insurance' ? 'card-outline' : 'person-circle-outline'}
      />

      {asset?.fileName ? (
        <Text numberOfLines={1} style={styles.uploadMeta}>
          {asset.fileName}
        </Text>
      ) : null}
      {errorMessage ? <Text style={styles.inlineError}>{errorMessage}</Text> : null}

      <View style={styles.uploadActions}>
        <SecondaryButton
          disabled={busyAction !== null || remoteStatus === 'uploading'}
          icon="camera-outline"
          loading={busyAction === `${documentType}-camera`}
          onPress={() => void onPick(documentType, 'camera')}
          style={styles.uploadActionButton}
          title="Take Photo"
        />
        <SecondaryButton
          disabled={busyAction !== null || remoteStatus === 'uploading'}
          icon="images-outline"
          loading={busyAction === `${documentType}-gallery`}
          onPress={() => void onPick(documentType, 'gallery')}
          style={styles.uploadActionButton}
          title="Upload"
        />
      </View>
    </View>
  );
}

export function DocumentsScreen({
  fieldErrors,
  form,
  onChange,
}: IntakeStepComponentProps) {
  const { setUploadAsset, state, syncSelectedUpload } = useDraftStore();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const attemptedUploadRef = useRef<Record<UploadDocumentType, string | null>>({
    id: null,
    insurance: null,
  });

  const handlePickDocument = async (
    documentType: UploadDocumentType,
    source: 'camera' | 'gallery',
  ) => {
    setBusyAction(`${documentType}-${source}`);

    try {
      const result = await pickDocumentFromSource(source);

      if (result.status === 'cancelled') {
        return;
      }

      if (result.status === 'permission_denied') {
        setPermissionMessage(
          result.source === 'camera'
            ? 'Allow camera access to capture documents.'
            : 'Allow photo access to choose a saved document.',
        );
        return;
      }

      void Haptics.selectionAsync();
      setPermissionMessage(null);
      attemptedUploadRef.current[documentType] = null;
      setUploadAsset(documentType, result.asset);
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    const insuranceAsset = state.uploads.insurance;
    const insuranceStatus = state.backend.uploads.insurance.status;
    const uploadKey = insuranceAsset?.updatedAt ?? null;

    if (!insuranceAsset) {
      attemptedUploadRef.current.insurance = null;
      return;
    }

    if (insuranceStatus === 'uploaded' || insuranceStatus === 'uploading') {
      return;
    }

    if (attemptedUploadRef.current.insurance === uploadKey) {
      return;
    }

    attemptedUploadRef.current.insurance = uploadKey;
    void syncSelectedUpload('insurance');
  }, [
    state.backend.uploads.insurance.status,
    state.uploads.insurance,
    syncSelectedUpload,
  ]);

  useEffect(() => {
    const idAsset = state.uploads.id;
    const idStatus = state.backend.uploads.id.status;
    const uploadKey = idAsset?.updatedAt ?? null;

    if (!idAsset) {
      attemptedUploadRef.current.id = null;
      return;
    }

    if (idStatus === 'uploaded' || idStatus === 'uploading') {
      return;
    }

    if (attemptedUploadRef.current.id === uploadKey) {
      return;
    }

    attemptedUploadRef.current.id = uploadKey;
    void syncSelectedUpload('id');
  }, [state.backend.uploads.id.status, state.uploads.id, syncSelectedUpload]);

  return (
    <InfoCard style={styles.mainCard}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo ID (Optional)</Text>

        {permissionMessage ? (
          <Text style={styles.permissionText}>{permissionMessage}</Text>
        ) : null}

        <UploadDocumentCard
          asset={state.uploads.id}
          busyAction={busyAction}
          documentType="id"
          errorMessage={state.backend.uploads.id.message}
          onPick={handlePickDocument}
          remoteStatus={state.backend.uploads.id.status}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insurance Card (Optional)</Text>
        <UploadDocumentCard
          asset={state.uploads.insurance}
          busyAction={busyAction}
          documentType="insurance"
          errorMessage={state.backend.uploads.insurance.message}
          onPick={handlePickDocument}
          remoteStatus={state.backend.uploads.insurance.status}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insurance Details (Optional)</Text>
        <View style={styles.fieldsGroup}>
          <InputField
            errorText={fieldErrors?.insuranceProvider}
            label="Insurance provider"
            onChangeText={(value) => onChange('insuranceProvider', value)}
            placeholder="Blue Cross Blue Shield"
            value={form.insuranceProvider}
          />
          <InputField
            errorText={fieldErrors?.memberId}
            label="Member ID"
            onChangeText={(value) => onChange('memberId', value)}
            placeholder="XJH-449922"
            value={form.memberId}
          />
          <InputField
            label="Group number"
            onChangeText={(value) => onChange('groupNumber', value)}
            placeholder="GRP-2024"
            value={form.groupNumber}
          />
          <InputField
            label="Subscriber name"
            onChangeText={(value) => onChange('subscriberName', value)}
            placeholder="Enter subscriber name"
            value={form.subscriberName}
          />
        </View>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  permissionText: {
    ...typography.caption,
    color: colors.warning,
  },
  fieldsGroup: {
    gap: spacing.md,
  },
  uploadBlock: {
    gap: spacing.md,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  uploadMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    maxWidth: 260,
  },
  uploadSurface: {
    minHeight: 156,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  uploadSurfaceEmpty: {
    gap: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 156,
    borderRadius: 16,
  },
  uploadSurfaceText: {
    ...typography.body,
    color: colors.primaryDeep,
    fontWeight: '600',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  uploadActionButton: {
    flex: 1,
  },
  inlineError: {
    ...typography.caption,
    color: colors.warning,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillSuccess: {
    backgroundColor: colors.accentMint,
    borderColor: colors.divider,
  },
  statusPillWarning: {
    backgroundColor: colors.accentGold,
    borderColor: colors.divider,
  },
  statusPillLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusPillLabelSuccess: {
    color: colors.success,
  },
  statusPillLabelWarning: {
    color: colors.warning,
  },
});
