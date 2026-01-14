/**
 * VegaLite spec builders for analytics charts.
 * Based on patterns from acho-launchpad's AnalyticsPanel.vue
 */

import type { VisualizationSpec } from 'vega-embed'
import type {
  CostTrendData,
  TokenUsageData,
  CostByModelData,
  LatencyDistributionData,
  LatencyPercentilesData,
} from './transformers'

// =============================================================================
// Cost Trend Chart (Area Chart with optional budget line)
// =============================================================================

export function createCostTrendSpec(data: CostTrendData[]): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values: data },
    layer: [
      {
        mark: { type: 'area', line: true, color: '#263A99', opacity: 0.3 },
        encoding: {
          x: {
            field: 'date',
            type: 'ordinal',
            sort: null,
            axis: { title: null, labelAngle: -45 },
          },
          y: {
            field: 'cost',
            type: 'quantitative',
            axis: { title: 'Cost ($)', format: '$.2f' },
          },
          tooltip: [
            { field: 'date', title: 'Date' },
            { field: 'cost', title: 'Cost', format: '$.4f' },
          ],
        },
      },
      // Budget reference line (optional)
      {
        mark: { type: 'rule', color: '#c1392b', strokeDash: [5, 5], strokeWidth: 2 },
        encoding: {
          y: { datum: 66.67 },
        },
      },
    ],
    config: { view: { stroke: null } },
  } as VisualizationSpec
}

// =============================================================================
// Request Volume Chart (Bar Chart)
// =============================================================================

export function createRequestVolumeSpec(data: CostTrendData[]): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values: data },
    mark: {
      type: 'bar',
      color: '#22c55e',
      cornerRadiusTopLeft: 4,
      cornerRadiusTopRight: 4,
    },
    encoding: {
      x: {
        field: 'date',
        type: 'ordinal',
        sort: null,
        axis: { title: null, labelAngle: -45 },
      },
      y: {
        field: 'requests',
        type: 'quantitative',
        axis: { title: 'Requests' },
      },
      tooltip: [
        { field: 'date', title: 'Date' },
        { field: 'requests', title: 'Requests' },
      ],
    },
    config: { view: { stroke: null } },
  } as VisualizationSpec
}

// =============================================================================
// Token Usage Chart (Stacked Bar Chart)
// =============================================================================

export function createTokenUsageSpec(data: TokenUsageData[]): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values: data },
    mark: {
      type: 'bar',
      cornerRadiusTopLeft: 4,
      cornerRadiusTopRight: 4,
    },
    encoding: {
      x: {
        field: 'date',
        type: 'ordinal',
        sort: null,
        axis: { title: null, labelAngle: -45 },
      },
      y: {
        field: 'tokens',
        type: 'quantitative',
        axis: { title: 'Tokens', format: '.2s' },
        stack: true,
      },
      color: {
        field: 'type',
        type: 'nominal',
        scale: { domain: ['Input', 'Output'], range: ['#263A99', '#22c55e'] },
        legend: { orient: 'bottom', title: null },
      },
      tooltip: [
        { field: 'date', title: 'Date' },
        { field: 'type', title: 'Type' },
        { field: 'tokens', title: 'Tokens', format: ',.0f' },
      ],
    },
    config: { view: { stroke: null } },
  } as VisualizationSpec
}

// =============================================================================
// Cost by Model Chart (Donut Chart)
// =============================================================================

export function createCostByModelSpec(data: CostByModelData[]): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 180,
    height: 180,
    data: { values: data },
    mark: { type: 'arc', innerRadius: 50 },
    encoding: {
      theta: { field: 'value', type: 'quantitative' },
      color: {
        field: 'name',
        type: 'nominal',
        scale: {
          domain: data.map((m) => m.name),
          range: data.map((m) => m.color),
        },
        legend: null,
      },
      tooltip: [
        { field: 'name', title: 'Model' },
        { field: 'value', title: 'Share (%)', format: '.0f' },
        { field: 'cost', title: 'Cost', format: '$.4f' },
      ],
    },
    config: { view: { stroke: null } },
  } as VisualizationSpec
}

// =============================================================================
// Latency Distribution Chart (Bar Chart)
// =============================================================================

export function createLatencyDistributionSpec(
  data: LatencyDistributionData[]
): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values: data },
    mark: {
      type: 'bar',
      color: '#263A99',
      cornerRadiusTopLeft: 4,
      cornerRadiusTopRight: 4,
    },
    encoding: {
      x: {
        field: 'range',
        type: 'ordinal',
        axis: { title: 'Latency Range' },
        sort: null,
      },
      y: {
        field: 'count',
        type: 'quantitative',
        axis: { title: 'Count' },
      },
      tooltip: [
        { field: 'range', title: 'Range' },
        { field: 'count', title: 'Count' },
      ],
    },
    config: { view: { stroke: null } },
  } as VisualizationSpec
}

// =============================================================================
// Latency Percentiles Chart (Multi-line Chart)
// =============================================================================

export function createLatencyPercentilesSpec(
  data: LatencyPercentilesData[]
): VisualizationSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
    data: { values: data },
    mark: { type: 'line', point: true },
    encoding: {
      x: {
        field: 'date',
        type: 'ordinal',
        sort: null,
        axis: { title: null, labelAngle: -45 },
      },
      y: {
        field: 'latency',
        type: 'quantitative',
        axis: { title: 'Latency (ms)' },
      },
      color: {
        field: 'percentile',
        type: 'nominal',
        scale: {
          domain: ['P50', 'P95', 'P99'],
          range: ['#263A99', '#f59e0b', '#c1392b'],
        },
        legend: null,
      },
      tooltip: [
        { field: 'date', title: 'Date' },
        { field: 'percentile', title: 'Percentile' },
        { field: 'latency', title: 'Latency (ms)', format: '.0f' },
      ],
    },
    config: { view: { stroke: null } },
  } as VisualizationSpec
}
