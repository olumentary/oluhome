import { NextRequest, NextResponse } from 'next/server';
import {
  exportCollectionCSV,
  exportCollectionJSON,
  exportInsuranceCSV,
} from '@/app/(dashboard)/actions';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format');

  try {
    switch (format) {
      case 'csv': {
        const csv = await exportCollectionCSV();
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="collection-export.csv"',
          },
        });
      }
      case 'json': {
        const json = await exportCollectionJSON();
        return new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="collection-export.json"',
          },
        });
      }
      case 'insurance': {
        const csv = await exportInsuranceCSV();
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="insurance-report.csv"',
          },
        });
      }
      default:
        return NextResponse.json(
          { error: 'Invalid format. Use csv, json, or insurance.' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 },
    );
  }
}
