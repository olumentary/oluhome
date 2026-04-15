import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const colors = {
  primary: '#2E3D6B',
  primaryLight: '#818AA6',
  text: '#1C1E26',
  textMuted: '#6B6E7B',
  border: '#E0DDD6',
  surface: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: colors.surface,
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.primaryLight,
    fontWeight: 500,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
  },
  rule: {
    width: 100,
    height: 1,
    backgroundColor: colors.primary,
    marginBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 16,
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.text,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  date: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
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

interface CoverPageProps {
  title: string;
  subtitle?: string;
  itemCount: number;
  totalValue?: string;
}

export function CoverPage({
  title,
  subtitle,
  itemCount,
  totalValue,
}: CoverPageProps) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.wordmark}>OluHome</Text>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}

      <View style={s.rule} />

      <View style={s.statsRow}>
        <View style={s.statBlock}>
          <Text style={s.statValue}>{itemCount}</Text>
          <Text style={s.statLabel}>
            Item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {totalValue && (
          <View style={s.statBlock}>
            <Text style={s.statValue}>{totalValue}</Text>
            <Text style={s.statLabel}>Estimated Value</Text>
          </View>
        )}
      </View>

      <Text style={s.date}>Prepared {today}</Text>

      <View style={s.footer}>
        <Text style={s.footerText}>Confidential</Text>
      </View>
    </Page>
  );
}
