import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { DraftBanner } from '../components/DraftBanner';
import { InfoCard } from '../components/InfoCard';
import { PermissionNotice } from '../components/PermissionNotice';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { UploadPreviewCard } from '../components/UploadPreviewCard';
import {
  formatDraftSyncStatus,
  formatLastSaved,
  pickDocumentFromSource,
  type UploadDocumentType,
  uploadChecklist,
  useDraftStore,
} from '../services';
import { colors, spacing, typography } from '../theme';

export function UploadScreen() {
  const { setUploadAsset, state, syncSelectedUpload } = useDraftStore();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<{
    message: string;
    title: string;
  } | null>(null);

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
        setPermissionNotice({
          message:
            result.source === 'camera'
              ? 'Allow camera access so NexGen Flo can capture insurance and ID photos directly in the app.'
              : 'Allow photo library access so NexGen Flo can import saved insurance and ID images.',
          title:
            result.source === 'camera'
              ? 'Camera access needed'
              : 'Photo library access needed',
        });
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPermissionNotice(null);
      setUploadAsset(documentType, result.asset);
      setTimeout(() => {
        void syncSelectedUpload(documentType);
      }, 0);
    } finally {
      setBusyAction(null);
    }
  };

  const clearSelectedDocument = (documentType: UploadDocumentType) => {
    void Haptics.selectionAsync();
    setUploadAsset(documentType, null);
  };

  return (
    <ScreenContainer>
      <SectionHeader
        eyebrow="Document Intake"
        subtitle="Add insurance and photo ID in the same intake flow staff will review later in NexGEN."
        title="Uploads"
      />

      <DraftBanner
        badgeLabel={state.backend.draft.status === 'synced' ? 'Synced' : 'Saved'}
        message={
          state.uploads.lastUpdatedAt
            ? `${formatLastSaved(state.uploads.lastUpdatedAt)}. ${formatDraftSyncStatus(
                state,
              )}`
            : formatDraftSyncStatus(state)
        }
        style={styles.banner}
        title="Upload pipeline status"
        tone={
          state.backend.uploads.insurance.status === 'error' ||
          state.backend.uploads.id.status === 'error'
            ? 'warning'
            : state.backend.draft.status === 'synced'
              ? 'success'
              : 'info'
        }
      />

      {permissionNotice ? (
        <View style={styles.noticeWrap}>
          <PermissionNotice
            message={permissionNotice.message}
            title={permissionNotice.title}
          />
        </View>
      ) : null}

      <View style={styles.previewGrid}>
        <UploadPreviewCard
          asset={state.uploads.insurance}
          icon="card-outline"
          selected={Boolean(state.uploads.insurance)}
          subtitle="Front and back capture placeholder for coverage verification."
          title="Insurance Card"
        />
        <UploadPreviewCard
          asset={state.uploads.id}
          icon="person-circle-outline"
          selected={Boolean(state.uploads.id)}
          subtitle="Photo ID placeholder for identity confirmation and matching."
          title="Government ID"
        />
      </View>

      <InfoCard
        subtitle="Upload the insurance card now or keep it saved locally until the backend draft is ready."
        title="Insurance Upload"
      >
        <PrimaryButton
          icon="camera-outline"
          disabled={busyAction !== null}
          loading={busyAction === 'insurance-camera'}
          onPress={() => handlePickDocument('insurance', 'camera')}
          title={
            busyAction === 'insurance-camera'
              ? 'Opening Camera...'
              : 'Take Insurance Photo'
          }
        />
        <SecondaryButton
          icon="images-outline"
          disabled={busyAction !== null}
          loading={busyAction === 'insurance-gallery'}
          onPress={() => handlePickDocument('insurance', 'gallery')}
          style={styles.galleryButton}
          title="Upload Insurance from Gallery"
        />
        {state.uploads.insurance ? (
          <SecondaryButton
            icon="trash-outline"
            disabled={state.backend.uploads.insurance.status === 'uploading'}
            onPress={() => clearSelectedDocument('insurance')}
            style={styles.clearButton}
            title="Clear Insurance Photo"
          />
        ) : null}
        {state.uploads.insurance ? (
          <SecondaryButton
            icon="cloud-upload-outline"
            disabled={state.backend.uploads.insurance.status === 'uploading'}
            loading={state.backend.uploads.insurance.status === 'uploading'}
            onPress={() => void syncSelectedUpload('insurance')}
            style={styles.clearButton}
            title={
              state.backend.uploads.insurance.status === 'uploading'
                ? 'Uploading Insurance...'
                : state.backend.uploads.insurance.status === 'error'
                  ? 'Retry Insurance Upload'
                : state.backend.uploads.insurance.status === 'uploaded'
                  ? 'Re-upload Insurance'
                  : 'Upload Insurance to Backend'
            }
          />
        ) : null}
        <Text style={styles.uploadStatusText}>
          {state.backend.uploads.insurance.message ??
            'Insurance images are kept locally until a backend draft is available.'}
        </Text>
      </InfoCard>

      <InfoCard
        style={styles.supportCard}
        subtitle="Photo ID capture uses the same shared draft flow so identity review stays connected to the intake."
        title="Photo ID Upload"
      >
        <PrimaryButton
          icon="camera-outline"
          disabled={busyAction !== null}
          loading={busyAction === 'id-camera'}
          onPress={() => handlePickDocument('id', 'camera')}
          title={
            busyAction === 'id-camera' ? 'Opening Camera...' : 'Take ID Photo'
          }
        />
        <SecondaryButton
          icon="images-outline"
          disabled={busyAction !== null}
          loading={busyAction === 'id-gallery'}
          onPress={() => handlePickDocument('id', 'gallery')}
          style={styles.galleryButton}
          title="Upload ID from Gallery"
        />
        {state.uploads.id ? (
          <SecondaryButton
            icon="trash-outline"
            disabled={state.backend.uploads.id.status === 'uploading'}
            onPress={() => clearSelectedDocument('id')}
            style={styles.clearButton}
            title="Clear ID Photo"
          />
        ) : null}
        {state.uploads.id ? (
          <SecondaryButton
            icon="cloud-upload-outline"
            disabled={state.backend.uploads.id.status === 'uploading'}
            loading={state.backend.uploads.id.status === 'uploading'}
            onPress={() => void syncSelectedUpload('id')}
            style={styles.clearButton}
            title={
              state.backend.uploads.id.status === 'uploading'
                ? 'Uploading ID...'
                : state.backend.uploads.id.status === 'error'
                  ? 'Retry ID Upload'
                : state.backend.uploads.id.status === 'uploaded'
                  ? 'Re-upload ID'
                  : 'Upload ID to Backend'
            }
          />
        ) : null}
        <Text style={styles.uploadStatusText}>
          {state.backend.uploads.id.message ??
            'ID images are kept locally until a backend draft is available.'}
        </Text>
      </InfoCard>

      <InfoCard
        style={styles.supportCard}
        subtitle="These upload checkpoints mirror what staff expects to confirm after the intake is submitted."
        title="Upload Checklist"
      >
        {uploadChecklist.map((item) => (
          <View key={item} style={styles.checklistRow}>
            <View style={styles.checkIcon}>
              <Ionicons color={colors.success} name="checkmark" size={14} />
            </View>
            <Text style={styles.checklistText}>{item}</Text>
          </View>
        ))}
      </InfoCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
  },
  noticeWrap: {
    marginBottom: spacing.md,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  galleryButton: {
    marginTop: spacing.md,
  },
  clearButton: {
    marginTop: spacing.md,
  },
  uploadStatusText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  supportCard: {
    marginTop: spacing.lg,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMint,
    marginRight: spacing.sm,
  },
  checklistText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
