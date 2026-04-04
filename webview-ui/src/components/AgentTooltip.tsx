import { useEffect, useState } from 'react';
import type { OfficeState } from '../office/engine/officeState.js';

interface AgentTooltipAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  salary: number;
  currency: string;
  level: number;
  tasksCompleted: number;
  pixelCharId?: number;
}

interface AgentTooltipProps {
  officeState: OfficeState;
  agents: AgentTooltipAgent[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
}

export function AgentTooltip({
  officeState,
  agents,
  containerRef,
  zoom,
  panRef,
}: AgentTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    name: string;
    role: string;
    salary: number;
    currency: string;
    status: string;
    level: number;
    tasksCompleted: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const hoveredId = officeState.hoveredAgentId;
      if (hoveredId !== null) {
        // Find agent by pixelCharId matching hoveredId
        const agent = agents.find(a => a.pixelCharId === hoveredId);
        if (agent) {
          const ch = officeState.characters.get(hoveredId);
          if (ch) {
            // Calculate screen position
            const el = containerRef.current;
            if (el) {
              const rect = el.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              const canvasW = Math.round(rect.width * dpr);
              const canvasH = Math.round(rect.height * dpr);
              const layout = officeState.getLayout();
              const mapW = layout.cols * 16 * zoom;
              const mapH = layout.rows * 16 * zoom;
              const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
              const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);
              
              const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
              const screenY = (deviceOffsetY + ch.y * zoom) / dpr;
              
              setTooltipData({
                x: screenX,
                y: screenY - 60,
                name: agent.name,
                role: agent.role,
                salary: agent.salary,
                currency: agent.currency || 'USD',
                status: agent.status || 'Active',
                level: agent.level || 1,
                tasksCompleted: agent.tasksCompleted || 0,
              });
              setVisible(true);
            }
          }
        } else {
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [officeState, agents, containerRef, zoom, panRef]);

  if (!visible || !tooltipData) return null;

  const levelNames = ['', 'Junior', 'Mid', 'Senior', 'Lead'];
  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: 'C$', AUD: 'A$', BRL: 'R$'
  };
  const sym = currencySymbols[tooltipData.currency] || '$';

  return (
    <div
      style={{
        position: 'absolute',
        left: tooltipData.x,
        top: tooltipData.y,
        transform: 'translateX(-50%)',
        background: 'rgba(20, 20, 35, 0.95)',
        border: '2px solid #66ddff',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        zIndex: 1000,
        pointerEvents: 'none',
        minWidth: '140px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* Agent Name */}
      <div style={{ color: '#66ddff', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
        👤 {tooltipData.name}
      </div>
      
      {/* Role */}
      <div style={{ color: '#aaaacc', marginBottom: '2px' }}>
        💼 {tooltipData.role}
      </div>
      
      {/* Level */}
      <div style={{ color: '#ffdd44', marginBottom: '2px' }}>
        ⭐ Level {tooltipData.level} ({levelNames[tooltipData.level] || 'Unknown'})
      </div>
      
      {/* Salary */}
      <div style={{ color: '#00ff88', marginBottom: '2px' }}>
        💰 {sym}{tooltipData.salary.toLocaleString()}/mo
      </div>
      
      {/* Tasks Completed */}
      <div style={{ color: '#ffaa44', marginBottom: '2px' }}>
        ✅ {tooltipData.tasksCompleted} tasks done
      </div>
      
      {/* Status */}
      <div style={{ 
        color: tooltipData.status === 'Active' ? '#00ff88' : '#ff6666',
        marginTop: '4px',
        borderTop: '1px solid #333355',
        paddingTop: '4px'
      }}>
        ● {tooltipData.status}
      </div>
    </div>
  );
}
