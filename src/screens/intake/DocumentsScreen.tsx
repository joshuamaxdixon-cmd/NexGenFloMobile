import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.previewBox}>
        <Image
          contentFit="cover"
          source={{ uri: asset.uri }}
          style={styles.previewImage}
        />
      </View>
    );
  }

  return (
    <View style={[styles.previewBox, styles.previewEmpty]}>
      <Ionicons color={colors.primaryDeep} name={icon} size={28} />
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
  title,
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
  title: string;
}) {
  const statusLabel = getUploadStatusLabel(remoteStatus);

  return (
    <View style={styles.uploadCard}>
      <View style={styles.uploadCardHeader}>
        <View>
          <Text style={styles.uploadTitle}>{title}</Text>
          {asset?.fileName ? (
            <Text numberOfLines={1} style={styles.uploadMeta}>
              {asset.fileName}
            </Text>
          ) : null}
        </View>
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
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
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
        <Text style={styles.sectionTitle}>Upload Documents</Text>

        {permissionMessage ? (
          <Text style={styles.permissionText}>{permissionMessage}</Text>
        ) : null}

        <UploadDocumentCard
          asset={state.uploads.insurance}
          busyAction={busyAction}
          documentType="insurance"
          errorMessage={state.backend.uploads.insurance.message}
          onPick={handlePickDocument}
          remoteStatus={state.backend.uploads.insurance.status}
          title="Insurance Card"
        />

        <UploadDocumentCard
          asset={state.uploads.id}
          busyAction={busyAction}
          documentType="id"
          errorMessage={state.backend.uploads.id.message}
          onPick={handlePickDocument}
          remoteStatus={state.backend.uploads.id.status}
          title="Photo ID"
        />
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setInsuranceExpanded((previous) => !previous)}
          style={styles.accordionHeader}
        >
          <View>
            <Text style={styles.sectionTitle}>Insurance Details (Optional)</Text>
          </View>
          <Ionicons
            color={colors.primaryDeep}
            name={insuranceExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
          />
        </Pressable>

        {insuranceExpanded ? (
          <View style={styles.accordionBody}>
            <InputField
              errorText={fieldErrors?.insuranceProvider}
              label="Insurance provider"
              onChangeText={(value) => onChange('insuranceProvider', value)}
              optional
              placeholder="Blue Cross Blue Shield"
              value={form.insuranceProvider}
            />
            <InputField
              errorText={fieldErrors?.memberId}
              label="Member ID"
              onChangeText={(value) => onChange('memberId', value)}
              optional
              placeholder="XJH-449922"
              value={form.memberId}
            />
            <InputField
              label="Group number"
              onChangeText={(value) => onChange('groupNumber', value)}
              optional
              placeholder="GRP-2024"
              value={form.groupNumber}
            />
            <InputField
              label="Subscriber name"
              onChangeText={(value) => onChange('subscriberName', value)}
              optional
              placeholder="Ava Johnson"
              value={form.subscriberName}
            />
          </View>
        ) : null}
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  permissionText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: -spacing.sm,
  },
  uploadCard: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft,
  },
  uploadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  uploadTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  uploadMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    maxWidth: 220,
  },
  previewBox: {
    height: 148,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmpty: {
    backgroundColor: colors.surfaceMuted,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
  accordionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  accordionBody: {
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
});
