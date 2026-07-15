#!/usr/bin/env node
// Financial-Intelligence-Strategy-Agent — MCP server.
// Exposes live Canadian open-data tools + the brief compiler over stdio.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { queryFinancialBehaviour, CONCEPT_VECTORS } from './adapters/statcan.js';
import { fetchHousingInsight } from './adapters/cmhc.js';
import { fetchSeries, fetchRateEnvironment, BOC_SERIES } from './adapters/bankofcanada.js';
import { compileStrategyBrief } from './tools/compile_strategy_brief.js';

const TOOLS = [
  {
    name: 'query_statcan_financial_behavior',
    description:
      'Query Statistics Canada (WDS) for household financial-behaviour indicators ' +
      '(debt-to-income, consumer credit, CPI). Provide a curated `concept` or an ' +
      'explicit `vectorId`. Returns latest value + trend with source provenance. ' +
      `Concepts: ${Object.keys(CONCEPT_VECTORS).join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        concept: { type: 'string', enum: Object.keys(CONCEPT_VECTORS) },
        table_id: { type: 'string', description: '8-digit StatCan product ID (provenance).' },
        vectorId: { type: 'number', description: 'Explicit WDS vector override.' },
        province: {
          type: 'string',
          enum: ['National', 'ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'Atlantic'],
          default: 'National',
        },
        latestN: { type: 'number', default: 8 },
      },
    },
    handler: (a) => queryFinancialBehaviour(a),
  },
  {
    name: 'fetch_cmhc_housing_insights',
    description:
      'Fetch CMHC Rental Market Survey insights for a Census Metropolitan Area ' +
      '(sourced via StatCan WDS). Metrics: rental_affordability (avg rent) or ' +
      'vacancy_rate. Returns latest value + trend for the requested bedroom type.',
    inputSchema: {
      type: 'object',
      properties: {
        cma_zone: { type: 'string', description: "e.g. 'Toronto', 'Vancouver', 'Calgary'." },
        metric: {
          type: 'string',
          enum: ['rental_affordability', 'vacancy_rate', 'mortgage_debt_ratios'],
          default: 'rental_affordability',
        },
        bedroom: {
          type: 'string',
          enum: ['Total', 'Bachelor', 'One bedroom', 'Two bedroom', 'Three bedroom +'],
          default: 'Two bedroom',
        },
        latestN: { type: 'number', default: 6 },
      },
      required: ['cma_zone'],
    },
    handler: (a) => fetchHousingInsight(a),
  },
  {
    name: 'fetch_boc_rates',
    description:
      'Fetch Bank of Canada (Valet API) rate/FX series that shape household borrowing ' +
      'cost and savings yield. Provide a `series` key or raw Valet id, or omit for the ' +
      `full headline rate environment. Series: ${Object.keys(BOC_SERIES).join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        series: { type: 'string', description: `One of: ${Object.keys(BOC_SERIES).join(', ')} or a raw Valet id.` },
        recent: { type: 'number', default: 6 },
      },
    },
    handler: (a) => (a.series ? fetchSeries(a.series, a.recent ?? 6) : fetchRateEnvironment()),
  },
  {
    name: 'compile_strategy_brief',
    description:
      'Write a finished strategy brief to /data/briefs and append it to the ' +
      'master_index.md matrix (by demographic + product category).',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: "e.g. 'gta_newcomer_credit_opportunity.md'" },
        target_demographic: { type: 'string' },
        banking_product_focus: { type: 'string' },
        markdown_body: { type: 'string' },
        geography: { type: 'string', default: 'National' },
        confidence: { type: 'string', enum: ['High', 'Low Confidence'], default: 'High' },
      },
      required: ['filename', 'target_demographic', 'banking_product_focus', 'markdown_body'],
    },
    handler: (a) => compileStrategyBrief(a),
  },
];

const server = new Server(
  { name: 'financial-intelligence-strategy-agent', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
  try {
    const result = await tool.handler(req.params.arguments || {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error in ${tool.name}: ${err.message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[fisa-mcp] Financial-Intelligence-Strategy-Agent MCP server running on stdio.');
