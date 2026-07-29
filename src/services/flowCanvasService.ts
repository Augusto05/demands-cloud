import { FlowCanvasStore, FlowBoard } from '../types';
import { saveStorageItem } from './syncService';

const STORAGE_KEY = 'demands_flow_canvas_store';

const DEFAULT_COLUMNS = [
  { id: 'col-1', name: 'Métrica' },
  { id: 'col-2', name: 'Valor' },
  { id: 'col-3', name: 'Delta %' }
];

export const INITIAL_BOARDS: FlowBoard[] = [
  {
    id: 'board-dm9-funnel',
    name: 'Fluxo Operacional DM9 & Boletos',
    description: 'Análise de conversão da URA, boletos gerados e contas abertas do escritório DM9',
    createdAt: '2026-07-27T10:00:00Z',
    updatedAt: '2026-07-27T10:00:00Z',
    nodes: [
      {
        id: 'node-ura',
        type: 'customTable',
        position: { x: 50, y: 120 },
        data: {
          label: 'URA & Atendimento URA DM9',
          iconName: 'PhoneCall',
          color: '#06B6D4', // Cyan
          columns: DEFAULT_COLUMNS,
          rows: [
            { id: 'r1', values: { 'col-1': 'Chamadas Atendidas', 'col-2': '1.420', 'col-3': '+8.5%' } },
            { id: 'r2', values: { 'col-1': 'Retenção Eletrônica', 'col-2': '68%', 'col-3': '+4.2%' } },
            { id: 'r3', values: { 'col-1': 'Encaminhadas Operador', 'col-2': '454', 'col-3': '-2.1%' } }
          ]
        }
      },
      {
        id: 'node-boletos',
        type: 'customTable',
        position: { x: 420, y: 120 },
        data: {
          label: 'Métricas Boletos DM9',
          iconName: 'FileText',
          color: '#F59E0B', // Amber
          columns: DEFAULT_COLUMNS,
          rows: [
            { id: 'r4', values: { 'col-1': 'Boletos Emitidos', 'col-2': '542', 'col-3': '+12.4%' } },
            { id: 'r5', values: { 'col-1': 'Meta Boletos / Dia', 'col-2': '500', 'col-3': '0.0%' } },
            { id: 'r6', values: { 'col-1': 'Ticket Médio', 'col-2': 'R$ 1.850', 'col-3': '+5.1%' } }
          ]
        }
      },
      {
        id: 'node-contas',
        type: 'customTable',
        position: { x: 790, y: 120 },
        data: {
          label: 'Contas Abertas & Conversão',
          iconName: 'UserCheck',
          color: '#10B981', // Emerald
          columns: DEFAULT_COLUMNS,
          rows: [
            { id: 'r7', values: { 'col-1': 'Contas Abertas', 'col-2': '41', 'col-3': '+17.1%' } },
            { id: 'r8', values: { 'col-1': 'Taxa Conversão', 'col-2': '7,56%', 'col-3': '+1.8%' } },
            { id: 'r9', values: { 'col-1': 'Meta Contas / Dia', 'col-2': '35', 'col-3': '0.0%' } }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'edge-ura-boletos',
        source: 'node-ura',
        target: 'node-boletos',
        animated: true,
        style: { stroke: '#06B6D4', strokeWidth: 2.5 },
        markerEnd: { type: 'arrowclosed', color: '#06B6D4' },
        label: 'Conversão URA'
      },
      {
        id: 'edge-boletos-contas',
        source: 'node-boletos',
        target: 'node-contas',
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2.5 },
        markerEnd: { type: 'arrowclosed', color: '#F59E0B' },
        label: 'Emissão → Abertura'
      }
    ]
  },
  {
    id: 'board-alianca-sul',
    name: 'Visão DER Aliança Sul & Celebra',
    description: 'Relacionamento entre URA Receptiva e Bloqueios Blocklist',
    createdAt: '2026-07-27T10:30:00Z',
    updatedAt: '2026-07-27T10:30:00Z',
    nodes: [
      {
        id: 'node-blocklist',
        type: 'customTable',
        position: { x: 80, y: 100 },
        data: {
          label: 'Base Blocklist Fila',
          iconName: 'ShieldAlert',
          color: '#EF4444', // Red
          columns: DEFAULT_COLUMNS,
          rows: [
            { id: 'br1', values: { 'col-1': 'Total Importado', 'col-2': '15.420', 'col-3': '-3.2%' } },
            { id: 'br2', values: { 'col-1': 'Números Bloqueados', 'col-2': '2.924', 'col-3': '+14.8%' } }
          ]
        }
      },
      {
        id: 'node-celebra',
        type: 'customTable',
        position: { x: 480, y: 100 },
        data: {
          label: 'Operacional Celebra URA',
          iconName: 'Building2',
          color: '#8B5CF6', // Purple
          columns: DEFAULT_COLUMNS,
          rows: [
            { id: 'cr1', values: { 'col-1': 'Atendimentos Válidos', 'col-2': '890', 'col-3': '+6.2%' } },
            { id: 'cr2', values: { 'col-1': 'Contas Confirmadas', 'col-2': '28', 'col-3': '+9.5%' } }
          ]
        }
      }
    ],
    edges: [
      {
        id: 'edge-blocklist-celebra',
        source: 'node-blocklist',
        target: 'node-celebra',
        animated: true,
        style: { stroke: '#EF4444', strokeWidth: 2.5 },
        markerEnd: { type: 'arrowclosed', color: '#EF4444' },
        label: 'Filtro Anti-Join'
      }
    ]
  }
];

export const getStoredFlowCanvasStore = (): FlowCanvasStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed: FlowCanvasStore = JSON.parse(raw);
      if (parsed.boards && parsed.boards.length > 0 && parsed.activeBoardId) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading Flow Canvas store:', e);
    }
  }
  return {
    boards: INITIAL_BOARDS,
    activeBoardId: INITIAL_BOARDS[0].id
  };
};

import { supabase } from './supabaseClient';

export const saveStoredFlowCanvasStore = (store: FlowCanvasStore): void => {
  saveStorageItem('flow_canvas', STORAGE_KEY, store);
  const client = supabase;
  if (client) {
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        client.from('flow_canvas').upsert({
          user_id: data.user!.id,
          nodes: store.boards,
          edges: [{ activeBoardId: store.activeBoardId }],
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.error('Supabase flow_canvas upsert error:', error);
        });
      }
    });
  }
};
