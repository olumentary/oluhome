import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { collectionItemTypes, planLimits } from './schema';
import type { FieldSchema } from '@/types';

// ---------------------------------------------------------------------------
// DB connection (standalone script — not the singleton from index.ts)
// ---------------------------------------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

// ---------------------------------------------------------------------------
// Default collection item types
// ---------------------------------------------------------------------------

interface DefaultType {
  name: string;
  slug: string;
  description: string;
  icon: string;
  displayOrder: number;
  fieldSchema: FieldSchema;
}

const defaultTypes: DefaultType[] = [
  {
    name: 'Furniture',
    slug: 'furniture',
    description: 'Tables, chairs, cabinets, desks, and other furniture pieces',
    icon: 'armchair',
    displayOrder: 1,
    fieldSchema: {
      fields: [
        {
          key: 'wood_type',
          label: 'Wood Type',
          type: 'multi_select',
          options: [
            'Oak',
            'Walnut',
            'Mahogany',
            'Cherry',
            'Maple',
            'Pine',
            'Rosewood',
            'Ebony',
            'Elm',
            'Satinwood',
            'Birch',
            'Teak',
            'Other',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'upholstery_type',
          label: 'Upholstery Type',
          type: 'select',
          options: [
            'Leather',
            'Velvet',
            'Silk',
            'Needlepoint',
            'Tapestry',
            'Linen',
            'Cotton',
            'Horsehair',
            'Cane',
            'Rush',
            'None',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'joinery_type',
          label: 'Joinery Type',
          type: 'select',
          options: [
            'Dovetail',
            'Mortise and Tenon',
            'Dowel',
            'Tongue and Groove',
            'Finger Joint',
            'Biscuit',
            'Nailed',
            'Screwed',
            'Unknown',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'hardware_type',
          label: 'Hardware Type',
          type: 'select',
          options: [
            'Brass',
            'Bronze',
            'Iron',
            'Silver',
            'Ormolu',
            'Wooden',
            'Porcelain',
            'Replacement',
            'None',
          ],
          required: false,
          group: 'Details',
        },
        {
          key: 'has_key',
          label: 'Has Key',
          type: 'boolean',
          required: false,
          group: 'Details',
        },
        {
          key: 'has_original_finish',
          label: 'Has Original Finish',
          type: 'boolean',
          required: false,
          group: 'Details',
        },
        {
          key: 'restoration_history',
          label: 'Restoration History',
          type: 'textarea',
          required: false,
          group: 'History',
        },
      ],
      measurement_presets: ['Overall', 'Seat Height', 'Arm Height', 'Leaf Extended'],
      default_materials: ['Wood', 'Veneer', 'Brass', 'Iron', 'Glass', 'Marble'],
      pdf_sections: ['Description', 'Measurements', 'Construction', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Porcelain & Ceramics',
    slug: 'porcelain-ceramics',
    description: 'Vases, figurines, plates, and other ceramic or porcelain items',
    icon: 'cup-soda',
    displayOrder: 2,
    fieldSchema: {
      fields: [
        {
          key: 'factory_mark',
          label: 'Factory Mark',
          type: 'text',
          required: false,
          group: 'Identification',
        },
        {
          key: 'pattern_name',
          label: 'Pattern Name',
          type: 'text',
          required: false,
          group: 'Identification',
        },
        {
          key: 'glaze_type',
          label: 'Glaze Type',
          type: 'select',
          options: [
            'Overglaze',
            'Underglaze',
            'Salt Glaze',
            'Celadon',
            'Majolica',
            'Matte',
            'Crackle',
            'Unglazed',
            'Other',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'firing_type',
          label: 'Firing Type',
          type: 'select',
          options: [
            'Hard Paste',
            'Soft Paste',
            'Bone China',
            'Stoneware',
            'Earthenware',
            'Porcelain',
            'Terracotta',
            'Raku',
            'Unknown',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'base_mark_description',
          label: 'Base Mark Description',
          type: 'textarea',
          required: false,
          group: 'Identification',
        },
      ],
      measurement_presets: ['Overall', 'Rim', 'Base', 'Opening'],
      default_materials: ['Porcelain', 'Ceramic', 'Stoneware', 'Earthenware', 'Bone China'],
      pdf_sections: ['Description', 'Marks', 'Measurements', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Textiles',
    slug: 'textiles',
    description: 'Tapestries, samplers, quilts, and decorative fabrics',
    icon: 'shirt',
    displayOrder: 3,
    fieldSchema: {
      fields: [
        {
          key: 'fiber_content',
          label: 'Fiber Content',
          type: 'multi_select',
          options: [
            'Silk',
            'Wool',
            'Cotton',
            'Linen',
            'Hemp',
            'Synthetic',
            'Gold Thread',
            'Silver Thread',
            'Mixed',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'weave_type',
          label: 'Weave Type',
          type: 'select',
          options: [
            'Plain',
            'Twill',
            'Satin',
            'Jacquard',
            'Tapestry',
            'Brocade',
            'Damask',
            'Velvet',
            'Embroidered',
            'Knitted',
            'Crocheted',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'thread_count',
          label: 'Thread Count',
          type: 'number',
          unit: 'threads/inch',
          required: false,
          group: 'Construction',
        },
        {
          key: 'colorfast',
          label: 'Colorfast',
          type: 'boolean',
          required: false,
          group: 'Condition',
        },
      ],
      measurement_presets: ['Overall', 'Visible Area', 'With Fringe'],
      default_materials: ['Silk', 'Wool', 'Cotton', 'Linen'],
      pdf_sections: ['Description', 'Construction', 'Measurements', 'Condition', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Rugs & Carpets',
    slug: 'rugs-carpets',
    description: 'Oriental rugs, kilims, needlepoint carpets, and floor coverings',
    icon: 'rectangle-horizontal',
    displayOrder: 4,
    fieldSchema: {
      fields: [
        {
          key: 'knot_type',
          label: 'Knot Type',
          type: 'select',
          options: [
            'Turkish (Ghiordes)',
            'Persian (Senneh)',
            'Jufti',
            'Tibetan',
            'Flatweave',
            'Unknown',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'knots_per_inch',
          label: 'Knots Per Inch',
          type: 'number',
          unit: 'KPSI',
          required: false,
          group: 'Construction',
        },
        {
          key: 'pile_material',
          label: 'Pile Material',
          type: 'select',
          options: ['Wool', 'Silk', 'Cotton', 'Wool & Silk', 'Synthetic', 'Other'],
          required: false,
          group: 'Construction',
        },
        {
          key: 'foundation_material',
          label: 'Foundation Material',
          type: 'select',
          options: ['Cotton', 'Wool', 'Silk', 'Jute', 'Synthetic', 'Other'],
          required: false,
          group: 'Construction',
        },
        {
          key: 'selvedge_condition',
          label: 'Selvedge Condition',
          type: 'select',
          options: ['Original', 'Rewrapped', 'Damaged', 'Missing', 'N/A'],
          required: false,
          group: 'Condition',
        },
      ],
      measurement_presets: ['Overall'],
      default_materials: ['Wool', 'Silk', 'Cotton'],
      pdf_sections: ['Description', 'Construction', 'Measurements', 'Condition', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Silver & Metalwork',
    slug: 'silver-metalwork',
    description: 'Sterling silver, silver plate, pewter, bronze, and decorative metalwork',
    icon: 'medal',
    displayOrder: 5,
    fieldSchema: {
      fields: [
        {
          key: 'hallmarks',
          label: 'Hallmarks',
          type: 'text',
          required: false,
          group: 'Identification',
        },
        {
          key: 'silver_standard',
          label: 'Silver Standard',
          type: 'select',
          options: [
            'Sterling (.925)',
            'Coin Silver (.900)',
            'Continental (.800)',
            'Britannia (.958)',
            'Silver Plate',
            'Sheffield Plate',
            'Pewter',
            'N/A',
          ],
          required: false,
          group: 'Identification',
        },
        {
          key: 'maker_mark',
          label: "Maker's Mark",
          type: 'text',
          required: false,
          group: 'Identification',
        },
        {
          key: 'weight_troy_oz',
          label: 'Weight (Troy Ounces)',
          type: 'number',
          unit: 'troy oz',
          required: false,
          group: 'Measurements',
        },
        {
          key: 'monogram',
          label: 'Monogram',
          type: 'text',
          required: false,
          group: 'Details',
        },
      ],
      measurement_presets: ['Overall', 'Base', 'Opening'],
      default_materials: ['Sterling Silver', 'Silver Plate', 'Pewter', 'Bronze', 'Brass', 'Copper'],
      pdf_sections: ['Description', 'Marks', 'Measurements', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Paintings & Prints',
    slug: 'paintings-prints',
    description: 'Oil paintings, watercolors, lithographs, etchings, and fine art prints',
    icon: 'frame',
    displayOrder: 6,
    fieldSchema: {
      fields: [
        {
          key: 'medium',
          label: 'Medium',
          type: 'multi_select',
          options: [
            'Oil',
            'Watercolor',
            'Gouache',
            'Acrylic',
            'Tempera',
            'Pastel',
            'Charcoal',
            'Ink',
            'Pencil',
            'Mixed Media',
          ],
          required: false,
          group: 'Details',
        },
        {
          key: 'support',
          label: 'Support',
          type: 'select',
          options: [
            'Canvas',
            'Panel',
            'Paper',
            'Board',
            'Copper',
            'Ivory',
            'Vellum',
            'Linen',
            'Other',
          ],
          required: false,
          group: 'Details',
        },
        {
          key: 'frame_period',
          label: 'Frame Period',
          type: 'text',
          required: false,
          group: 'Frame',
        },
        {
          key: 'signed',
          label: 'Signed',
          type: 'boolean',
          required: false,
          group: 'Details',
        },
        {
          key: 'signature_location',
          label: 'Signature Location',
          type: 'text',
          required: false,
          group: 'Details',
        },
        {
          key: 'print_technique',
          label: 'Print Technique',
          type: 'select',
          options: [
            'Lithograph',
            'Etching',
            'Engraving',
            'Woodcut',
            'Screenprint',
            'Mezzotint',
            'Aquatint',
            'Drypoint',
            'Linocut',
            'N/A',
          ],
          required: false,
          group: 'Print Details',
        },
        {
          key: 'edition',
          label: 'Edition',
          type: 'text',
          required: false,
          group: 'Print Details',
        },
      ],
      measurement_presets: ['Sight', 'Sheet', 'Frame', 'Image'],
      default_materials: ['Oil Paint', 'Canvas', 'Paper', 'Wood Panel'],
      pdf_sections: ['Description', 'Details', 'Measurements', 'Frame', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Glass',
    slug: 'glass',
    description: 'Art glass, crystal, pressed glass, and decorative glass objects',
    icon: 'wine',
    displayOrder: 7,
    fieldSchema: {
      fields: [
        {
          key: 'technique',
          label: 'Technique',
          type: 'multi_select',
          options: [
            'Blown',
            'Mold Blown',
            'Pressed',
            'Cut',
            'Engraved',
            'Etched',
            'Enameled',
            'Overlay/Cased',
            'Cameo',
            'Lampwork',
            'Fused',
            'Stained',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'pontil_type',
          label: 'Pontil Type',
          type: 'select',
          options: [
            'Open Pontil',
            'Ground Pontil',
            'Polished Pontil',
            'Snap Case (No Pontil)',
            'Not Visible',
            'N/A',
          ],
          required: false,
          group: 'Construction',
        },
        {
          key: 'color_description',
          label: 'Color Description',
          type: 'text',
          required: false,
          group: 'Details',
        },
      ],
      measurement_presets: ['Overall', 'Rim', 'Base'],
      default_materials: ['Glass', 'Crystal', 'Leaded Glass'],
      pdf_sections: ['Description', 'Construction', 'Measurements', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    description: 'Chandeliers, sconces, lamps, lanterns, and candlesticks',
    icon: 'lamp',
    displayOrder: 8,
    fieldSchema: {
      fields: [
        {
          key: 'fixture_type',
          label: 'Fixture Type',
          type: 'select',
          options: [
            'Chandelier',
            'Sconce',
            'Table Lamp',
            'Floor Lamp',
            'Lantern',
            'Candlestick',
            'Candelabra',
            'Pendant',
            'Girandole',
            'Other',
          ],
          required: false,
          group: 'Details',
        },
        {
          key: 'electrified',
          label: 'Electrified',
          type: 'boolean',
          required: false,
          group: 'Details',
        },
        {
          key: 'original_fuel_type',
          label: 'Original Fuel Type',
          type: 'select',
          options: ['Candle', 'Oil', 'Gas', 'Kerosene', 'Electric (Original)', 'N/A'],
          required: false,
          group: 'Details',
        },
        {
          key: 'shade_material',
          label: 'Shade Material',
          type: 'select',
          options: [
            'Glass',
            'Fabric',
            'Mica',
            'Slag Glass',
            'Leaded Glass',
            'Parchment',
            'Metal',
            'None',
          ],
          required: false,
          group: 'Shade',
        },
        {
          key: 'shade_included',
          label: 'Shade Included',
          type: 'boolean',
          required: false,
          group: 'Shade',
        },
      ],
      measurement_presets: ['Overall', 'Base', 'Shade', 'Chain/Drop'],
      default_materials: ['Brass', 'Bronze', 'Crystal', 'Iron', 'Glass'],
      pdf_sections: ['Description', 'Details', 'Measurements', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Clocks & Watches',
    slug: 'clocks-watches',
    description: 'Mantel clocks, wall clocks, tall-case clocks, and pocket watches',
    icon: 'clock',
    displayOrder: 9,
    fieldSchema: {
      fields: [
        {
          key: 'movement_type',
          label: 'Movement Type',
          type: 'select',
          options: [
            'Mechanical (Key Wind)',
            'Mechanical (Spring)',
            'Quartz',
            'Weight Driven',
            'Electric',
            'Unknown',
          ],
          required: false,
          group: 'Movement',
        },
        {
          key: 'movement_maker',
          label: 'Movement Maker',
          type: 'text',
          required: false,
          group: 'Movement',
        },
        {
          key: 'case_material',
          label: 'Case Material',
          type: 'select',
          options: [
            'Mahogany',
            'Walnut',
            'Oak',
            'Gilt Bronze',
            'Marble',
            'Porcelain',
            'Brass',
            'Silver',
            'Gold',
            'Iron',
            'Other',
          ],
          required: false,
          group: 'Case',
        },
        {
          key: 'dial_type',
          label: 'Dial Type',
          type: 'select',
          options: [
            'Enamel',
            'Painted',
            'Silvered',
            'Brass',
            'Porcelain',
            'Paper',
            'Other',
          ],
          required: false,
          group: 'Case',
        },
        {
          key: 'runs',
          label: 'Runs',
          type: 'boolean',
          required: false,
          group: 'Condition',
        },
      ],
      measurement_presets: ['Overall', 'Dial', 'Case'],
      default_materials: ['Wood', 'Brass', 'Bronze', 'Enamel', 'Glass'],
      pdf_sections: ['Description', 'Movement', 'Case', 'Measurements', 'Provenance', 'Valuation'],
    },
  },
  {
    name: 'Books & Manuscripts',
    slug: 'books-manuscripts',
    description: 'Rare books, first editions, manuscripts, maps, and documents',
    icon: 'book-open',
    displayOrder: 10,
    fieldSchema: {
      fields: [
        {
          key: 'binding_type',
          label: 'Binding Type',
          type: 'select',
          options: [
            'Full Leather',
            'Half Leather',
            'Quarter Leather',
            'Cloth',
            'Boards',
            'Vellum',
            'Paper Wrappers',
            'Calf',
            'Morocco',
            'Pigskin',
            'Modern',
            'Unbound',
          ],
          required: false,
          group: 'Details',
        },
        {
          key: 'edition',
          label: 'Edition',
          type: 'text',
          required: false,
          group: 'Details',
        },
        {
          key: 'publisher',
          label: 'Publisher',
          type: 'text',
          required: false,
          group: 'Details',
        },
        {
          key: 'print_year',
          label: 'Print Year',
          type: 'number',
          required: false,
          group: 'Details',
        },
        {
          key: 'plates_count',
          label: 'Number of Plates',
          type: 'number',
          required: false,
          group: 'Details',
        },
        {
          key: 'condition_specifics',
          label: 'Condition Specifics',
          type: 'textarea',
          required: false,
          group: 'Condition',
        },
      ],
      measurement_presets: ['Overall'],
      default_materials: ['Paper', 'Leather', 'Vellum', 'Board', 'Cloth'],
      pdf_sections: ['Description', 'Details', 'Condition', 'Provenance', 'Valuation'],
    },
  },
];

// ---------------------------------------------------------------------------
// Plan limits data
// ---------------------------------------------------------------------------

const planLimitsData = [
  {
    plan: 'free' as const,
    maxItems: 25,
    maxPhotosPerItem: 3,
    maxStorageMb: 500,
    maxCustomTypes: 2,
    aiAnalysesPerMonth: 5,
    pdfExportsPerMonth: 10,
    shareLinksEnabled: false,
    batchPdfEnabled: false,
    analyticsEnabled: false,
    prioritySupport: false,
  },
  {
    plan: 'pro' as const,
    maxItems: 250,
    maxPhotosPerItem: 10,
    maxStorageMb: 5120,
    maxCustomTypes: 10,
    aiAnalysesPerMonth: 50,
    pdfExportsPerMonth: -1, // unlimited
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: false,
  },
  {
    plan: 'premium' as const,
    maxItems: -1, // unlimited
    maxPhotosPerItem: 25,
    maxStorageMb: 25600,
    maxCustomTypes: -1, // unlimited
    aiAnalysesPerMonth: 200,
    pdfExportsPerMonth: -1, // unlimited
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
  },
  {
    plan: 'admin' as const,
    maxItems: -1,
    maxPhotosPerItem: -1,
    maxStorageMb: -1,
    maxCustomTypes: -1,
    aiAnalysesPerMonth: -1,
    pdfExportsPerMonth: -1,
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Seed plan limits (upsert)
  console.log('  → Inserting plan limits...');
  for (const row of planLimitsData) {
    await db
      .insert(planLimits)
      .values(row)
      .onConflictDoUpdate({
        target: planLimits.plan,
        set: {
          maxItems: row.maxItems,
          maxPhotosPerItem: row.maxPhotosPerItem,
          maxStorageMb: row.maxStorageMb,
          maxCustomTypes: row.maxCustomTypes,
          aiAnalysesPerMonth: row.aiAnalysesPerMonth,
          pdfExportsPerMonth: row.pdfExportsPerMonth,
          shareLinksEnabled: row.shareLinksEnabled,
          batchPdfEnabled: row.batchPdfEnabled,
          analyticsEnabled: row.analyticsEnabled,
          prioritySupport: row.prioritySupport,
        },
      });
  }
  console.log('    ✓ 4 plan limits upserted');

  // Seed default collection item types (user_id = null → system defaults)
  console.log('  → Inserting default collection item types...');
  for (const t of defaultTypes) {
    await db
      .insert(collectionItemTypes)
      .values({
        userId: null,
        name: t.name,
        slug: t.slug,
        description: t.description,
        icon: t.icon,
        fieldSchema: t.fieldSchema,
        displayOrder: t.displayOrder,
        isDefault: true,
      })
      .onConflictDoNothing();
  }
  console.log(`    ✓ ${defaultTypes.length} default item types inserted`);

  console.log('\n✅ Seed complete!');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
