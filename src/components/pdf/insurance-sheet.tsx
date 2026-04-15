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
  CONDITION_LABELS,
  VALUATION_TYPE_LABELS,
  VALUATION_PURPOSE_LABELS,
} from '@/lib/pdf';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const colors = {
  primary: '#2E3D6B',
  text: '#1C1E26',
  textMuted: '#6B6E7B',
  border: '#E0DDD6',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F1EA',
  background: '#FDF9F2',
  warning: '#BEA03C',
  warningBg: '#FBF5E0',
  danger: '#AF504B',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: colors.surface,
    paddingTop: 43, // 0.6"
    paddingBottom: 43,
    paddingHorizontal: 43,
    fontSize: 8,
    color: colors.text,
  },

  // Header band
  headerBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1pt solid ${colors.primary}`,
    paddingBottom: 6,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    color: colors.primary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerRef: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Two-column top
  topSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  photoColumn: {
    width: '58%',
  },
  infoColumn: {
    width: '42%',
  },
  primaryPhoto: {
    maxHeight: 180, // ~2.5"
    objectFit: 'contain',
    marginBottom: 8,
  },
  noPhoto: {
    height: 150,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    border: `0.5pt solid ${colors.border}`,
    marginBottom: 8,
  },
  noPhotoText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  thumbnailGrid: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  thumbnail: {
    width: 86, // ~1.2"
    height: 64,
    objectFit: 'cover',
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.textMuted,
    width: 64,
  },
  infoValue: {
    fontSize: 8,
    color: colors.text,
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
    marginTop: 8,
    borderBottom: `0.5pt solid ${colors.border}`,
    paddingBottom: 2,
  },

  // Dimensions table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.surface,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceAlt,
  },
  tableCell: {
    fontSize: 7,
    color: colors.text,
  },

  // Dimension columns
  dimLabel: { width: '22%' },
  dimH: { width: '13%' },
  dimW: { width: '13%' },
  dimD: { width: '13%' },
  dimDiam: { width: '13%' },
  dimNotes: { width: '26%' },

  // Acquisition row
  acquisitionGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  acquisitionItem: {
    flexDirection: 'row',
    gap: 4,
  },

  // Valuation table columns
  valDate: { width: '16%' },
  valType: { width: '16%' },
  valValue: { width: '24%' },
  valAppraiser: { width: '24%' },
  valPurpose: { width: '20%' },

  // Insured value box
  insuredBox: {
    backgroundColor: colors.warningBg,
    border: `1pt solid ${colors.warning}`,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  insuredLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.textMuted,
    marginBottom: 2,
  },
  insuredValue: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.text,
  },
  noInsuredBox: {
    backgroundColor: '#FDE8E7',
    border: `1pt solid ${colors.danger}`,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  noInsuredText: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.danger,
  },

  // Provenance
  provenanceText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.5,
    maxLines: 3,
  },

  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 43,
    right: 43,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InsuranceSheetProps {
  item: ItemForPdf;
  ownerName?: string;
}

export function InsuranceSheet({ item, ownerName }: InsuranceSheetProps) {
  const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const additionalPhotos = item.photos
    .filter((p) => p.id !== primaryPhoto?.id)
    .slice(0, 4);
  const shortId = item.id.slice(0, 8).toUpperCase();
  const dimensions = formatDimensions(item);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Find latest insured valuation
  const insuredValuation = item.valuations.find(
    (v) => v.valuationType === 'insured',
  );

  const acq = item.latestAcquisition;

  // Truncated provenance
  const provenanceSnippet = item.provenanceNarrative
    ? item.provenanceNarrative.length > 300
      ? item.provenanceNarrative.slice(0, 300) + '...'
      : item.provenanceNarrative
    : null;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header Band */}
        <View style={s.headerBand}>
          <Text style={s.headerTitle}>
            COLLECTION ITEM {'\u2014'} INSURANCE DOCUMENTATION
          </Text>
          <View style={s.headerRight}>
            <Text style={s.headerRef}>Ref. OLU-{shortId}</Text>
            <Text style={s.headerRef}>Prepared {today}</Text>
          </View>
        </View>

        {/* Two-column top section */}
        <View style={s.topSection}>
          {/* Left — Photos */}
          <View style={s.photoColumn}>
            {primaryPhoto?.base64 ? (
              <Image src={primaryPhoto.base64} style={s.primaryPhoto} />
            ) : (
              <View style={s.noPhoto}>
                <Text style={s.noPhotoText}>No photo available</Text>
              </View>
            )}
            {additionalPhotos.length > 0 && (
              <View style={s.thumbnailGrid}>
                {additionalPhotos.map(
                  (photo) =>
                    photo.base64 && (
                      <Image
                        key={photo.id}
                        src={photo.base64}
                        style={s.thumbnail}
                      />
                    ),
                )}
              </View>
            )}
          </View>

          {/* Right — Info */}
          <View style={s.infoColumn}>
            <Text style={s.itemTitle}>{item.title}</Text>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Type</Text>
              <Text style={s.infoValue}>{item.itemType.name}</Text>
            </View>
            {item.period && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Period</Text>
                <Text style={s.infoValue}>{item.period}</Text>
              </View>
            )}
            {item.style && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Style</Text>
                <Text style={s.infoValue}>{item.style}</Text>
              </View>
            )}
            {item.originCountry && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Origin</Text>
                <Text style={s.infoValue}>
                  {[item.originCountry, item.originRegion]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
            {item.condition && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Condition</Text>
                <Text style={s.infoValue}>
                  {CONDITION_LABELS[item.condition] ?? item.condition}
                </Text>
              </View>
            )}
            {item.conditionNotes && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Notes</Text>
                <Text style={s.infoValue}>{item.conditionNotes}</Text>
              </View>
            )}
            {item.materials && item.materials.length > 0 && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Materials</Text>
                <Text style={s.infoValue}>{item.materials.join(', ')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Dimensions Table */}
        {(dimensions || item.measurements.length > 0) && (
          <>
            <Text style={s.sectionHeader}>Dimensions</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.dimLabel]}>Component</Text>
              <Text style={[s.tableHeaderCell, s.dimH]}>H</Text>
              <Text style={[s.tableHeaderCell, s.dimW]}>W</Text>
              <Text style={[s.tableHeaderCell, s.dimD]}>D</Text>
              <Text style={[s.tableHeaderCell, s.dimDiam]}>Diam</Text>
              <Text style={[s.tableHeaderCell, s.dimNotes]}>Notes</Text>
            </View>
            {/* Overall row */}
            <View style={s.tableRow}>
              <Text style={[s.tableCell, s.dimLabel]}>Overall</Text>
              <Text style={[s.tableCell, s.dimH]}>
                {item.height ?? '\u2014'}
              </Text>
              <Text style={[s.tableCell, s.dimW]}>
                {item.width ?? '\u2014'}
              </Text>
              <Text style={[s.tableCell, s.dimD]}>
                {item.depth ?? '\u2014'}
              </Text>
              <Text style={[s.tableCell, s.dimDiam]}>
                {item.diameter ?? '\u2014'}
              </Text>
              <Text style={[s.tableCell, s.dimNotes]}>{'\u2014'}</Text>
            </View>
            {/* Additional measurements */}
            {item.measurements.map((m, i) => (
              <View
                key={m.id}
                style={i % 2 === 0 ? s.tableRowAlt : s.tableRow}
              >
                <Text style={[s.tableCell, s.dimLabel]}>{m.label}</Text>
                <Text style={[s.tableCell, s.dimH]}>
                  {m.height ?? '\u2014'}
                </Text>
                <Text style={[s.tableCell, s.dimW]}>
                  {m.width ?? '\u2014'}
                </Text>
                <Text style={[s.tableCell, s.dimD]}>
                  {m.depth ?? '\u2014'}
                </Text>
                <Text style={[s.tableCell, s.dimDiam]}>
                  {m.diameter ?? '\u2014'}
                </Text>
                <Text style={[s.tableCell, s.dimNotes]}>
                  {m.notes ?? '\u2014'}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Acquisition Details */}
        {acq && (
          <>
            <Text style={s.sectionHeader}>Acquisition Details</Text>
            <View style={s.acquisitionGrid}>
              {acq.vendor && (
                <View style={s.acquisitionItem}>
                  <Text style={s.infoLabel}>Vendor</Text>
                  <Text style={s.infoValue}>
                    {acq.vendor.businessName ?? acq.vendor.name}
                  </Text>
                </View>
              )}
              {acq.acquisitionDate && (
                <View style={s.acquisitionItem}>
                  <Text style={s.infoLabel}>Date</Text>
                  <Text style={s.infoValue}>
                    {formatDateShort(acq.acquisitionDate)}
                  </Text>
                </View>
              )}
              {acq.purchasePrice && (
                <View style={s.acquisitionItem}>
                  <Text style={s.infoLabel}>Purchase</Text>
                  <Text style={s.infoValue}>
                    {formatCurrency(acq.purchasePrice)}
                  </Text>
                </View>
              )}
              {acq.totalCost && (
                <View style={s.acquisitionItem}>
                  <Text style={s.infoLabel}>Total Cost</Text>
                  <Text style={s.infoValue}>
                    {formatCurrency(acq.totalCost)}
                  </Text>
                </View>
              )}
              {acq.saleName && (
                <View style={s.acquisitionItem}>
                  <Text style={s.infoLabel}>Sale/Lot</Text>
                  <Text style={s.infoValue}>
                    {acq.saleName}
                    {acq.lotNumber ? ` (Lot ${acq.lotNumber})` : ''}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Valuation History */}
        {item.valuations.length > 0 && (
          <>
            <Text style={s.sectionHeader}>Valuation History</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.valDate]}>Date</Text>
              <Text style={[s.tableHeaderCell, s.valType]}>Type</Text>
              <Text style={[s.tableHeaderCell, s.valValue]}>Value/Range</Text>
              <Text style={[s.tableHeaderCell, s.valAppraiser]}>Appraiser</Text>
              <Text style={[s.tableHeaderCell, s.valPurpose]}>Purpose</Text>
            </View>
            {item.valuations.map((v, i) => (
              <View
                key={v.id}
                style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
              >
                <Text style={[s.tableCell, s.valDate]}>
                  {formatDateShort(v.valuationDate)}
                </Text>
                <Text style={[s.tableCell, s.valType]}>
                  {VALUATION_TYPE_LABELS[v.valuationType] ?? v.valuationType}
                </Text>
                <Text style={[s.tableCell, s.valValue]}>
                  {formatValuationRange(v)}
                </Text>
                <Text style={[s.tableCell, s.valAppraiser]}>
                  {v.appraiserName ?? '\u2014'}
                </Text>
                <Text style={[s.tableCell, s.valPurpose]}>
                  {v.purpose
                    ? (VALUATION_PURPOSE_LABELS[v.purpose] ?? v.purpose)
                    : '\u2014'}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Insured Value Box */}
        {insuredValuation ? (
          <View style={s.insuredBox}>
            <Text style={s.insuredLabel}>CURRENT INSURED VALUE</Text>
            <Text style={s.insuredValue}>
              {formatValuationRange(insuredValuation)}
            </Text>
          </View>
        ) : (
          <View style={s.noInsuredBox}>
            <Text style={s.noInsuredText}>
              NO CURRENT INSURANCE VALUATION
            </Text>
          </View>
        )}

        {/* Provenance summary */}
        {provenanceSnippet && (
          <>
            <Text style={s.sectionHeader}>Provenance</Text>
            <Text style={s.provenanceText}>{provenanceSnippet}</Text>
          </>
        )}

        {/* Footer */}
        <View style={s.pageFooter}>
          <Text style={s.footerText}>{ownerName ?? 'Owner'}</Text>
          <Text style={s.footerText}>Prepared {today}</Text>
        </View>
      </Page>
    </Document>
  );
}
