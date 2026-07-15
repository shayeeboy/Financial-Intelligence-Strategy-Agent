// CMHC — Canada Mortgage and Housing Corporation adapter.
//
// CMHC's Housing Market Information Portal (HMIP) exposes no stable public JSON
// API (endpoints return rendered HTML). CMHC's authoritative Rental Market Survey
// results are, however, published as StatCan cubes and refreshed on CMHC's release
// schedule. We therefore source CMHC-origin data through the StatCan WDS — reliable,
// versioned, and citable — rather than scraping HMIP.
//
// Tables used:
//   34-10-0133  CMHC average rents, areas with population 10,000+
//   34-10-0127  CMHC vacancy rates, areas with population 10,000+

import { getCubeMetadata, getCoordData, resolveCoordinate } from './statcan.js';

const TABLES = {
  average_rent: { pid: '34100133', valueLabel: 'Average rent ($/month)' },
  vacancy_rate: { pid: '34100127', valueLabel: 'Vacancy rate (%)' },
};

// Broadest structure member = the standard headline (all row + apartment 3+ units).
const DEFAULT_STRUCTURE = 'Row and apartment structures of three units and over';

// Friendly bedroom terms -> the "Type of unit" member names in tables 34-10-0133/0127.
const BEDROOM_MAP = {
  Total: null, // resolver falls back to a Total/first member
  Bachelor: 'Bachelor units',
  'One bedroom': 'One bedroom units',
  'Two bedroom': 'Two bedroom units',
  'Three bedroom +': 'Three bedroom units',
};

// Map the CMHC "metric" enum from the input schema onto our source tables.
const METRIC_MAP = {
  rental_affordability: 'average_rent',
  mortgage_debt_ratios: 'average_rent', // proxied via rent burden; see brief methodology
  average_rent: 'average_rent',
  vacancy_rate: 'vacancy_rate',
};

/**
 * Fetch a CMHC housing insight for a Census Metropolitan Area.
 * @param {object} args
 * @param {string} args.cma_zone - e.g., 'Toronto', 'Vancouver', 'Calgary'.
 * @param {string} [args.metric='rental_affordability']
 * @param {string} [args.bedroom='Total'] - 'Total', 'Bachelor', 'One bedroom', 'Two bedroom', 'Three bedroom +'
 * @param {number} [args.latestN=6]
 */
export async function fetchHousingInsight(args = {}) {
  const { cma_zone, metric = 'rental_affordability', bedroom = 'Total', latestN = 6 } = args;
  if (!cma_zone) throw new Error('fetchHousingInsight requires `cma_zone`.');

  const tableKey = METRIC_MAP[metric] || 'average_rent';
  const table = TABLES[tableKey];
  const meta = await getCubeMetadata(table.pid);

  // Dimensions: 1=Geography (CMA), 2=Type of structure, 3=Type of unit (bedrooms).
  const bedroomMember = bedroom in BEDROOM_MAP ? BEDROOM_MAP[bedroom] : bedroom;
  const { coordinate, resolved } = resolveCoordinate(meta, [
    cma_zone,
    DEFAULT_STRUCTURE,
    bedroomMember,
  ]);

  // Guard: make sure geography actually matched the requested CMA.
  const geoMatch = resolved[0]?.member || '';
  if (!new RegExp(escapeRx(cma_zone), 'i').test(geoMatch)) {
    throw new Error(
      `CMA "${cma_zone}" not found in ${table.pid}. Closest member resolved: "${geoMatch}". ` +
        `Check the CMA spelling (e.g., 'Toronto', 'Vancouver', 'Montréal').`
    );
  }

  const data = await getCoordData(table.pid, coordinate, latestN);

  return {
    source: 'CMHC Rental Market Survey (via Statistics Canada WDS)',
    cma_zone,
    metric,
    structure_type: resolved[1]?.member || DEFAULT_STRUCTURE,
    unit_type: resolved[2]?.member || bedroom,
    value_label: table.valueLabel,
    table_id: table.pid,
    source_url: `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${table.pid}`,
    hmip_reference: 'https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research',
    coordinate,
    resolved_dimensions: resolved,
    latest: data.latest,
    trend: data.points,
    retrieved_at: new Date().toISOString(),
  };
}

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
