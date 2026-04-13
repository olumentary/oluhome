"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var neon_serverless_1 = require("drizzle-orm/neon-serverless");
var serverless_1 = require("@neondatabase/serverless");
var schema_1 = require("./schema");
// ---------------------------------------------------------------------------
// DB connection (standalone script — not the singleton from index.ts)
// ---------------------------------------------------------------------------
var pool = new serverless_1.Pool({ connectionString: process.env.DATABASE_URL });
var db = (0, neon_serverless_1.drizzle)(pool);
var defaultTypes = [
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
var planLimitsData = [
    {
        plan: 'free',
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
        plan: 'pro',
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
        plan: 'premium',
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
        plan: 'admin',
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
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, planLimitsData_1, row, _a, defaultTypes_1, t;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🌱 Seeding database...\n');
                    // Seed plan limits (upsert)
                    console.log('  → Inserting plan limits...');
                    _i = 0, planLimitsData_1 = planLimitsData;
                    _b.label = 1;
                case 1:
                    if (!(_i < planLimitsData_1.length)) return [3 /*break*/, 4];
                    row = planLimitsData_1[_i];
                    return [4 /*yield*/, db
                            .insert(schema_1.planLimits)
                            .values(row)
                            .onConflictDoUpdate({
                            target: schema_1.planLimits.plan,
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
                        })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('    ✓ 4 plan limits upserted');
                    // Seed default collection item types (user_id = null → system defaults)
                    console.log('  → Inserting default collection item types...');
                    _a = 0, defaultTypes_1 = defaultTypes;
                    _b.label = 5;
                case 5:
                    if (!(_a < defaultTypes_1.length)) return [3 /*break*/, 8];
                    t = defaultTypes_1[_a];
                    return [4 /*yield*/, db
                            .insert(schema_1.collectionItemTypes)
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
                            .onConflictDoNothing()];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log("    \u2713 ".concat(defaultTypes.length, " default item types inserted"));
                    console.log('\n✅ Seed complete!');
                    return [2 /*return*/];
            }
        });
    });
}
seed()
    .catch(function (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
})
    .finally(function () { return pool.end(); });
