import { Document } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { ItemForPdf } from '@/lib/pdf';
import { CatalogCard } from './catalog-card';
import { InsuranceSheet } from './insurance-sheet';
import { CoverPage } from './cover-page';

// ---------------------------------------------------------------------------
// We need the inner page content without the outer Document wrapper so we can
// compose multiple items into a single Document. The templates each wrap in
// <Document>, so we extract the children (Pages) instead.
// ---------------------------------------------------------------------------

// Re-export standalone page components that don't wrap in <Document>
// We import the originals and pull out their Page children in the factory below.

interface BatchDocumentProps {
  title: string;
  subtitle?: string;
  items: ItemForPdf[];
  template: 'catalog' | 'insurance';
  ownerName?: string;
  totalValue?: string;
}

export function BatchDocument({
  title,
  subtitle,
  items,
  template,
  ownerName,
  totalValue,
}: BatchDocumentProps) {
  return (
    <Document>
      {createElement(CoverPage, {
        title,
        subtitle,
        itemCount: items.length,
        totalValue,
      })}
      {items.map((item) => {
        // Render the appropriate template — but we need the Page, not Document.
        // Since our templates return <Document><Page>...</Page></Document>,
        // we use the page-level components directly below.
        if (template === 'catalog') {
          return (
            <CatalogCardPage key={item.id} item={item} />
          );
        }
        return (
          <InsuranceSheetPage
            key={item.id}
            item={item}
            ownerName={ownerName}
          />
        );
      })}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Page-only variants (no Document wrapper) for batch embedding
// These duplicate the template content but return only the <Page>.
// We import from the template modules and extract the page.
// ---------------------------------------------------------------------------

// For batch, we render standalone pages that match the single-item templates.
// We simply re-render the template's Document and extract the Page child.
// However, @react-pdf/renderer does not support nested Documents, so we need
// page-only components. We'll create thin wrappers that call the same rendering.

import {
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import {
  formatDimensions,
  formatCurrency,
  formatDateShort,
  formatValuationRange,
  formatCustomFieldValue,
  CONDITION_LABELS,
  VALUATION_TYPE_LABELS,
  VALUATION_PURPOSE_LABELS,
} from '@/lib/pdf';

// ---------- Catalog Card Page (no Document) ----------

const catalogColors = {
  primary: '#2E3D6B',
  primaryLight: '#818AA6',
  text: '#1C1E26',
  textMuted: '#6B6E7B',
  border: '#E0DDD6',
  surface: '#FFFFFF',
  background: '#FDF9F2',
};

const cs = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: catalogColors.surface,
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 54,
    fontSize: 9,
    color: catalogColors.text,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  wordmark: { fontSize: 10, fontStyle: 'italic', color: catalogColors.primaryLight, fontWeight: 500 },
  reference: { fontSize: 8, color: catalogColors.textMuted },
  photoSection: { alignItems: 'center', marginBottom: 36 },
  photoWrapper: { border: `0.5pt solid ${catalogColors.border}`, padding: 4 },
  photo: { maxHeight: 252, objectFit: 'contain' },
  noPhoto: { width: 252, height: 180, backgroundColor: catalogColors.background, alignItems: 'center', justifyContent: 'center', border: `0.5pt solid ${catalogColors.border}` },
  noPhotoText: { fontSize: 8, color: catalogColors.textMuted },
  titleBlock: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 700, textAlign: 'center', color: catalogColors.text, marginBottom: 4, maxLines: 2 },
  titleSmall: { fontSize: 14, fontWeight: 700, textAlign: 'center', color: catalogColors.text, marginBottom: 4, maxLines: 2 },
  subtitle: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', color: catalogColors.textMuted, marginBottom: 2 },
  attribution: { fontSize: 10, fontStyle: 'italic', textAlign: 'center', color: catalogColors.textMuted, marginBottom: 6 },
  rule: { height: 0.5, backgroundColor: catalogColors.primary, marginVertical: 10 },
  ruleLight: { height: 0.5, backgroundColor: catalogColors.border, marginVertical: 8 },
  metadataGrid: { flexDirection: 'row', gap: 24, marginBottom: 10 },
  metadataColumn: { flex: 1 },
  metadataRow: { flexDirection: 'row', marginBottom: 4 },
  metadataLabel: { fontSize: 9, fontWeight: 700, color: catalogColors.text, width: 80 },
  metadataValue: { fontSize: 9, color: catalogColors.text, flex: 1 },
  provenanceHeader: { fontSize: 11, fontStyle: 'italic', color: catalogColors.text, marginBottom: 6 },
  provenanceText: { fontSize: 9, fontStyle: 'italic', color: catalogColors.text, lineHeight: 1.6, textAlign: 'justify', maxLines: 8 },
  valuationFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 },
  valuationText: { fontSize: 10, fontWeight: 700, color: catalogColors.text, textAlign: 'right' },
  valuationDate: { fontSize: 8, color: catalogColors.textMuted, textAlign: 'right', marginTop: 2 },
  pageFooter: { position: 'absolute', bottom: 30, left: 54, right: 54, textAlign: 'center' },
  footerText: { fontSize: 7, color: catalogColors.textMuted, textAlign: 'center' },
});

function CatalogCardPage({ item }: { item: ItemForPdf }) {
  const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const latestValuation = item.valuations[0];
  const shortId = item.id.slice(0, 8).toUpperCase();
  const subtitleParts = [item.period, item.style, item.originCountry].filter(Boolean);
  const dimensions = formatDimensions(item);
  const titleLength = item.title.length;

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

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Page size="LETTER" style={cs.page}>
      <View style={cs.header}>
        <Text style={cs.wordmark}>Curiolu</Text>
        <Text style={cs.reference}>Ref. OLU-{shortId}</Text>
      </View>
      <View style={cs.photoSection}>
        {primaryPhoto?.base64 ? (
          <View style={cs.photoWrapper}>
            <Image src={primaryPhoto.base64} style={cs.photo} />
          </View>
        ) : (
          <View style={cs.noPhoto}>
            <Text style={cs.noPhotoText}>No photo available</Text>
          </View>
        )}
      </View>
      <View style={cs.titleBlock}>
        <Text style={titleLength > 50 ? cs.titleSmall : cs.title}>{item.title}</Text>
        {subtitleParts.length > 0 && <Text style={cs.subtitle}>{subtitleParts.join(' \u00b7 ')}</Text>}
        {item.makerAttribution && <Text style={cs.attribution}>{item.makerAttribution}</Text>}
      </View>
      <View style={cs.rule} />
      <View style={cs.metadataGrid}>
        <View style={cs.metadataColumn}>
          {item.materials && item.materials.length > 0 && (
            <View style={cs.metadataRow}>
              <Text style={cs.metadataLabel}>Materials:</Text>
              <Text style={cs.metadataValue}>{item.materials.join(', ')}</Text>
            </View>
          )}
          {dimensions && (
            <View style={cs.metadataRow}>
              <Text style={cs.metadataLabel}>Dimensions:</Text>
              <Text style={cs.metadataValue}>{dimensions}</Text>
            </View>
          )}
          {item.condition && (
            <View style={cs.metadataRow}>
              <Text style={cs.metadataLabel}>Condition:</Text>
              <Text style={cs.metadataValue}>{CONDITION_LABELS[item.condition] ?? item.condition}</Text>
            </View>
          )}
          {(item.room || item.positionInRoom) && (
            <View style={cs.metadataRow}>
              <Text style={cs.metadataLabel}>Location:</Text>
              <Text style={cs.metadataValue}>{[item.room, item.positionInRoom].filter(Boolean).join(' / ')}</Text>
            </View>
          )}
        </View>
        {customFieldEntries.length > 0 && (
          <View style={cs.metadataColumn}>
            {customFieldEntries.map((entry) => (
              <View key={entry.label} style={cs.metadataRow}>
                <Text style={cs.metadataLabel}>{entry.label}:</Text>
                <Text style={cs.metadataValue}>{entry.value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {item.provenanceNarrative && (
        <>
          <View style={cs.ruleLight} />
          <Text style={cs.provenanceHeader}>Provenance</Text>
          <Text style={cs.provenanceText}>{item.provenanceNarrative}</Text>
        </>
      )}
      <View style={cs.rule} />
      {latestValuation && (
        <View style={cs.valuationFooter}>
          <View>
            <Text style={cs.valuationText}>Estimated Value: {formatValuationRange(latestValuation)}</Text>
            {latestValuation.valuationDate && (
              <Text style={cs.valuationDate}>Appraised {formatDateShort(latestValuation.valuationDate)}</Text>
            )}
          </View>
        </View>
      )}
      <View style={cs.pageFooter}>
        <Text style={cs.footerText}>Confidential — Prepared {today}</Text>
      </View>
    </Page>
  );
}

// ---------- Insurance Sheet Page (no Document) ----------

const insuranceColors = {
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

const is = StyleSheet.create({
  page: { fontFamily: 'Inter', backgroundColor: insuranceColors.surface, paddingTop: 43, paddingBottom: 43, paddingHorizontal: 43, fontSize: 8, color: insuranceColors.text },
  headerBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1pt solid ${insuranceColors.primary}`, paddingBottom: 6, marginBottom: 12 },
  headerTitle: { fontSize: 12, fontWeight: 700, letterSpacing: 1, color: insuranceColors.primary },
  headerRight: { alignItems: 'flex-end' },
  headerRef: { fontSize: 8, color: insuranceColors.textMuted },
  topSection: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  photoColumn: { width: '58%' },
  infoColumn: { width: '42%' },
  primaryPhoto: { maxHeight: 180, objectFit: 'contain', marginBottom: 8 },
  noPhoto: { height: 150, backgroundColor: insuranceColors.background, alignItems: 'center', justifyContent: 'center', border: `0.5pt solid ${insuranceColors.border}`, marginBottom: 8 },
  noPhotoText: { fontSize: 8, color: insuranceColors.textMuted },
  thumbnailGrid: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  thumbnail: { width: 86, height: 64, objectFit: 'cover' },
  itemTitle: { fontSize: 11, fontWeight: 700, color: insuranceColors.text, marginBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { fontSize: 8, fontWeight: 600, color: insuranceColors.textMuted, width: 64 },
  infoValue: { fontSize: 8, color: insuranceColors.text, flex: 1 },
  sectionHeader: { fontSize: 9, fontWeight: 700, color: insuranceColors.primary, marginBottom: 4, marginTop: 8, borderBottom: `0.5pt solid ${insuranceColors.border}`, paddingBottom: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: insuranceColors.primary, paddingVertical: 3, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 7, fontWeight: 700, color: insuranceColors.surface },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4 },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, backgroundColor: insuranceColors.surfaceAlt },
  tableCell: { fontSize: 7, color: insuranceColors.text },
  dimLabel: { width: '22%' }, dimH: { width: '13%' }, dimW: { width: '13%' }, dimD: { width: '13%' }, dimDiam: { width: '13%' }, dimNotes: { width: '26%' },
  acquisitionGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  acquisitionItem: { flexDirection: 'row', gap: 4 },
  valDate: { width: '16%' }, valType: { width: '16%' }, valValue: { width: '24%' }, valAppraiser: { width: '24%' }, valPurpose: { width: '20%' },
  insuredBox: { backgroundColor: insuranceColors.warningBg, border: `1pt solid ${insuranceColors.warning}`, borderRadius: 4, padding: 10, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  insuredLabel: { fontSize: 8, fontWeight: 600, color: insuranceColors.textMuted, marginBottom: 2 },
  insuredValue: { fontSize: 16, fontWeight: 700, color: insuranceColors.text },
  noInsuredBox: { backgroundColor: '#FDE8E7', border: `1pt solid ${insuranceColors.danger}`, borderRadius: 4, padding: 10, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  noInsuredText: { fontSize: 10, fontWeight: 700, color: insuranceColors.danger },
  provenanceText: { fontSize: 8, color: insuranceColors.text, lineHeight: 1.5, maxLines: 3 },
  pageFooter: { position: 'absolute', bottom: 24, left: 43, right: 43, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: insuranceColors.textMuted },
});

function InsuranceSheetPage({ item, ownerName }: { item: ItemForPdf; ownerName?: string }) {
  const primaryPhoto = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const additionalPhotos = item.photos.filter((p) => p.id !== primaryPhoto?.id).slice(0, 4);
  const shortId = item.id.slice(0, 8).toUpperCase();
  const dimensions = formatDimensions(item);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const insuredValuation = item.valuations.find((v) => v.valuationType === 'insured');
  const acq = item.latestAcquisition;
  const provenanceSnippet = item.provenanceNarrative
    ? item.provenanceNarrative.length > 300 ? item.provenanceNarrative.slice(0, 300) + '...' : item.provenanceNarrative
    : null;

  return (
    <Page size="LETTER" style={is.page}>
      <View style={is.headerBand}>
        <Text style={is.headerTitle}>COLLECTION ITEM {'\u2014'} INSURANCE DOCUMENTATION</Text>
        <View style={is.headerRight}>
          <Text style={is.headerRef}>Ref. OLU-{shortId}</Text>
          <Text style={is.headerRef}>Prepared {today}</Text>
        </View>
      </View>
      <View style={is.topSection}>
        <View style={is.photoColumn}>
          {primaryPhoto?.base64 ? (
            <Image src={primaryPhoto.base64} style={is.primaryPhoto} />
          ) : (
            <View style={is.noPhoto}><Text style={is.noPhotoText}>No photo available</Text></View>
          )}
          {additionalPhotos.length > 0 && (
            <View style={is.thumbnailGrid}>
              {additionalPhotos.map((photo) => photo.base64 && <Image key={photo.id} src={photo.base64} style={is.thumbnail} />)}
            </View>
          )}
        </View>
        <View style={is.infoColumn}>
          <Text style={is.itemTitle}>{item.title}</Text>
          <View style={is.infoRow}><Text style={is.infoLabel}>Type</Text><Text style={is.infoValue}>{item.itemType.name}</Text></View>
          {item.period && <View style={is.infoRow}><Text style={is.infoLabel}>Period</Text><Text style={is.infoValue}>{item.period}</Text></View>}
          {item.style && <View style={is.infoRow}><Text style={is.infoLabel}>Style</Text><Text style={is.infoValue}>{item.style}</Text></View>}
          {item.originCountry && <View style={is.infoRow}><Text style={is.infoLabel}>Origin</Text><Text style={is.infoValue}>{[item.originCountry, item.originRegion].filter(Boolean).join(', ')}</Text></View>}
          {item.condition && <View style={is.infoRow}><Text style={is.infoLabel}>Condition</Text><Text style={is.infoValue}>{CONDITION_LABELS[item.condition] ?? item.condition}</Text></View>}
          {item.conditionNotes && <View style={is.infoRow}><Text style={is.infoLabel}>Notes</Text><Text style={is.infoValue}>{item.conditionNotes}</Text></View>}
          {item.materials && item.materials.length > 0 && <View style={is.infoRow}><Text style={is.infoLabel}>Materials</Text><Text style={is.infoValue}>{item.materials.join(', ')}</Text></View>}
        </View>
      </View>
      {(dimensions || item.measurements.length > 0) && (
        <>
          <Text style={is.sectionHeader}>Dimensions</Text>
          <View style={is.tableHeader}>
            <Text style={[is.tableHeaderCell, is.dimLabel]}>Component</Text>
            <Text style={[is.tableHeaderCell, is.dimH]}>H</Text>
            <Text style={[is.tableHeaderCell, is.dimW]}>W</Text>
            <Text style={[is.tableHeaderCell, is.dimD]}>D</Text>
            <Text style={[is.tableHeaderCell, is.dimDiam]}>Diam</Text>
            <Text style={[is.tableHeaderCell, is.dimNotes]}>Notes</Text>
          </View>
          <View style={is.tableRow}>
            <Text style={[is.tableCell, is.dimLabel]}>Overall</Text>
            <Text style={[is.tableCell, is.dimH]}>{item.height ?? '\u2014'}</Text>
            <Text style={[is.tableCell, is.dimW]}>{item.width ?? '\u2014'}</Text>
            <Text style={[is.tableCell, is.dimD]}>{item.depth ?? '\u2014'}</Text>
            <Text style={[is.tableCell, is.dimDiam]}>{item.diameter ?? '\u2014'}</Text>
            <Text style={[is.tableCell, is.dimNotes]}>{'\u2014'}</Text>
          </View>
          {item.measurements.map((m, i) => (
            <View key={m.id} style={i % 2 === 0 ? is.tableRowAlt : is.tableRow}>
              <Text style={[is.tableCell, is.dimLabel]}>{m.label}</Text>
              <Text style={[is.tableCell, is.dimH]}>{m.height ?? '\u2014'}</Text>
              <Text style={[is.tableCell, is.dimW]}>{m.width ?? '\u2014'}</Text>
              <Text style={[is.tableCell, is.dimD]}>{m.depth ?? '\u2014'}</Text>
              <Text style={[is.tableCell, is.dimDiam]}>{m.diameter ?? '\u2014'}</Text>
              <Text style={[is.tableCell, is.dimNotes]}>{m.notes ?? '\u2014'}</Text>
            </View>
          ))}
        </>
      )}
      {acq && (
        <>
          <Text style={is.sectionHeader}>Acquisition Details</Text>
          <View style={is.acquisitionGrid}>
            {acq.vendor && <View style={is.acquisitionItem}><Text style={is.infoLabel}>Vendor</Text><Text style={is.infoValue}>{acq.vendor.businessName ?? acq.vendor.name}</Text></View>}
            {acq.acquisitionDate && <View style={is.acquisitionItem}><Text style={is.infoLabel}>Date</Text><Text style={is.infoValue}>{formatDateShort(acq.acquisitionDate)}</Text></View>}
            {acq.purchasePrice && <View style={is.acquisitionItem}><Text style={is.infoLabel}>Purchase</Text><Text style={is.infoValue}>{formatCurrency(acq.purchasePrice)}</Text></View>}
            {acq.totalCost && <View style={is.acquisitionItem}><Text style={is.infoLabel}>Total Cost</Text><Text style={is.infoValue}>{formatCurrency(acq.totalCost)}</Text></View>}
            {acq.saleName && <View style={is.acquisitionItem}><Text style={is.infoLabel}>Sale/Lot</Text><Text style={is.infoValue}>{acq.saleName}{acq.lotNumber ? ` (Lot ${acq.lotNumber})` : ''}</Text></View>}
          </View>
        </>
      )}
      {item.valuations.length > 0 && (
        <>
          <Text style={is.sectionHeader}>Valuation History</Text>
          <View style={is.tableHeader}>
            <Text style={[is.tableHeaderCell, is.valDate]}>Date</Text>
            <Text style={[is.tableHeaderCell, is.valType]}>Type</Text>
            <Text style={[is.tableHeaderCell, is.valValue]}>Value/Range</Text>
            <Text style={[is.tableHeaderCell, is.valAppraiser]}>Appraiser</Text>
            <Text style={[is.tableHeaderCell, is.valPurpose]}>Purpose</Text>
          </View>
          {item.valuations.map((v, i) => (
            <View key={v.id} style={i % 2 === 0 ? is.tableRow : is.tableRowAlt}>
              <Text style={[is.tableCell, is.valDate]}>{formatDateShort(v.valuationDate)}</Text>
              <Text style={[is.tableCell, is.valType]}>{VALUATION_TYPE_LABELS[v.valuationType] ?? v.valuationType}</Text>
              <Text style={[is.tableCell, is.valValue]}>{formatValuationRange(v)}</Text>
              <Text style={[is.tableCell, is.valAppraiser]}>{v.appraiserName ?? '\u2014'}</Text>
              <Text style={[is.tableCell, is.valPurpose]}>{v.purpose ? (VALUATION_PURPOSE_LABELS[v.purpose] ?? v.purpose) : '\u2014'}</Text>
            </View>
          ))}
        </>
      )}
      {insuredValuation ? (
        <View style={is.insuredBox}>
          <Text style={is.insuredLabel}>CURRENT INSURED VALUE</Text>
          <Text style={is.insuredValue}>{formatValuationRange(insuredValuation)}</Text>
        </View>
      ) : (
        <View style={is.noInsuredBox}>
          <Text style={is.noInsuredText}>NO CURRENT INSURANCE VALUATION</Text>
        </View>
      )}
      {provenanceSnippet && (
        <>
          <Text style={is.sectionHeader}>Provenance</Text>
          <Text style={is.provenanceText}>{provenanceSnippet}</Text>
        </>
      )}
      <View style={is.pageFooter}>
        <Text style={is.footerText}>{ownerName ?? 'Owner'}</Text>
        <Text style={is.footerText}>Prepared {today}</Text>
      </View>
    </Page>
  );
}
