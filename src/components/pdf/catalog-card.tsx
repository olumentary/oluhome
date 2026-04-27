import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ItemForPdf } from '@/lib/pdf';
import {
  formatDimensions,
  formatCurrency,
  formatDateShort,
  formatValuationRange,
  formatCustomFieldValue,
  CONDITION_LABELS,
} from '@/lib/pdf';

// ---------------------------------------------------------------------------
// Design tokens (matches Curiolu theme)
// ---------------------------------------------------------------------------

const colors = {
  primary: '#2E3D6B',
  primaryLight: '#818AA6',
  text: '#1C1E26',
  textMuted: '#6B6E7B',
  border: '#E0DDD6',
  surface: '#FFFFFF',
  background: '#FDF9F2',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: colors.surface,
    paddingTop: 54, // 0.75"
    paddingBottom: 54,
    paddingHorizontal: 54,
    fontSize: 9,
    color: colors.text,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.primaryLight,
    fontWeight: 500,
  },
  reference: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Photo
  photoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  photoWrapper: {
    border: `0.5pt solid ${colors.border}`,
    padding: 4,
  },
  photo: {
    maxHeight: 252, // ~3.5"
    objectFit: 'contain',
  },
  noPhoto: {
    width: 252,
    height: 180,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    border: `0.5pt solid ${colors.border}`,
  },
  noPhotoText: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Title block
  titleBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: colors.text,
    marginBottom: 4,
    maxLines: 2,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    color: colors.text,
    marginBottom: 4,
    maxLines: 2,
  },
  subtitle: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 2,
  },
  attribution: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 6,
  },
  rule: {
    height: 0.5,
    backgroundColor: colors.primary,
    marginVertical: 10,
  },
  ruleLight: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  // Metadata grid
  metadataGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 10,
  },
  metadataColumn: {
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
    width: 80,
  },
  metadataValue: {
    fontSize: 9,
    color: colors.text,
    flex: 1,
  },

  // Provenance
  provenanceHeader: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.text,
    marginBottom: 6,
  },
  provenanceText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 1.6,
    textAlign: 'justify',
    maxLines: 8,
  },

  // Valuation footer
  valuationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  valuationText: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    textAlign: 'right',
  },
  valuationDate: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Page footer
  pageFooter: {
    position: 'absolute',
    bottom: 30,
    left: 54,
    right: 54,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CatalogCardProps {
  item: ItemForPdf;
}

export function CatalogCard({ item }: CatalogCardProps) {
  const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const latestValuation = item.valuations[0];
  const shortId = item.id.slice(0, 8).toUpperCase();
  const subtitleParts = [item.period, item.style, item.originCountry].filter(
    Boolean,
  );
  const dimensions = formatDimensions(item);
  const titleLength = item.title.length;

  // Custom fields from field schema
  const customFieldEntries: Array<{ label: string; value: string }> = [];
  if (item.fieldSchema?.fields) {
    for (const field of item.fieldSchema.fields) {
      const raw = item.customFieldValues[field.key];
      if (raw == null) continue;
      const formatted = formatCustomFieldValue(raw, field.type, field.unit);
      if (!formatted) continue;
      customFieldEntries.push({ label: field.label, value: formatted });
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.wordmark}>Curiolu</Text>
          <Text style={s.reference}>Ref. OLU-{shortId}</Text>
        </View>

        {/* Photo */}
        <View style={s.photoSection}>
          {primaryPhoto?.base64 ? (
            <View style={s.photoWrapper}>
              <Image src={primaryPhoto.base64} style={s.photo} />
            </View>
          ) : (
            <View style={s.noPhoto}>
              <Text style={s.noPhotoText}>No photo available</Text>
            </View>
          )}
        </View>

        {/* Title Block */}
        <View style={s.titleBlock}>
          <Text style={titleLength > 50 ? s.titleSmall : s.title}>
            {item.title}
          </Text>
          {subtitleParts.length > 0 && (
            <Text style={s.subtitle}>{subtitleParts.join(' \u00b7 ')}</Text>
          )}
          {item.makerAttribution && (
            <Text style={s.attribution}>{item.makerAttribution}</Text>
          )}
        </View>

        <View style={s.rule} />

        {/* Metadata Grid */}
        <View style={s.metadataGrid}>
          {/* Left column — base fields */}
          <View style={s.metadataColumn}>
            {item.materials && item.materials.length > 0 && (
              <View style={s.metadataRow}>
                <Text style={s.metadataLabel}>Materials:</Text>
                <Text style={s.metadataValue}>
                  {item.materials.join(', ')}
                </Text>
              </View>
            )}
            {dimensions && (
              <View style={s.metadataRow}>
                <Text style={s.metadataLabel}>Dimensions:</Text>
                <Text style={s.metadataValue}>{dimensions}</Text>
              </View>
            )}
            {item.condition && (
              <View style={s.metadataRow}>
                <Text style={s.metadataLabel}>Condition:</Text>
                <Text style={s.metadataValue}>
                  {CONDITION_LABELS[item.condition] ?? item.condition}
                </Text>
              </View>
            )}
            {(item.room || item.positionInRoom) && (
              <View style={s.metadataRow}>
                <Text style={s.metadataLabel}>Location:</Text>
                <Text style={s.metadataValue}>
                  {[item.room, item.positionInRoom].filter(Boolean).join(' / ')}
                </Text>
              </View>
            )}
          </View>

          {/* Right column — custom fields */}
          {customFieldEntries.length > 0 && (
            <View style={s.metadataColumn}>
              {customFieldEntries.map((entry) => (
                <View key={entry.label} style={s.metadataRow}>
                  <Text style={s.metadataLabel}>{entry.label}:</Text>
                  <Text style={s.metadataValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Provenance */}
        {item.provenanceNarrative && (
          <>
            <View style={s.ruleLight} />
            <Text style={s.provenanceHeader}>Provenance</Text>
            <Text style={s.provenanceText}>{item.provenanceNarrative}</Text>
          </>
        )}

        <View style={s.rule} />

        {/* Valuation footer */}
        {latestValuation && (
          <View style={s.valuationFooter}>
            <View>
              <Text style={s.valuationText}>
                Estimated Value: {formatValuationRange(latestValuation)}
              </Text>
              {latestValuation.valuationDate && (
                <Text style={s.valuationDate}>
                  Appraised {formatDateShort(latestValuation.valuationDate)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Page footer */}
        <View style={s.pageFooter}>
          <Text style={s.footerText}>
            Confidential — Prepared {today}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
