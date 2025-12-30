'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  assignedTo: string;
  createdAt: string;
  budget?: number;
  interestedVehicle?: string;
  notes?: string;
}

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const statusColumns = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-orange-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export default function LeadKanbanBoard({ leads, onLeadClick, onStatusChange }: LeadKanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedLead) {
      onStatusChange(draggedLead.id, status);
      setDraggedLead(null);
    }
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statusColumns.map(column => {
        const columnLeads = getLeadsByStatus(column.id);
        return (
          <div
            key={column.id}
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className={`${column.color} text-white p-3 rounded-t-lg`}>
              <h3 className="font-semibold">{column.label}</h3>
              <span className="text-sm">({columnLeads.length})</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-b-lg min-h-[200px] space-y-2">
              {columnLeads.map(lead => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  onClick={() => onLeadClick(lead)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="font-semibold text-sm">
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {lead.email}
                    </div>
                    {lead.interestedVehicle && (
                      <div className="text-xs mt-2 text-gray-700 dark:text-gray-300">
                        🚗 {lead.interestedVehicle}
                      </div>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {lead.source}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}