import React, { useState } from 'react';
import { STAGES } from '../lib/constants';
import BidCard from './BidCard';

export default function Board({ bids, commissionFor, onOpenBid, onMoveStage }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  return (
    <div className="overflow-x-auto pb-4 kanban-scroll">
      <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-4 min-w-max px-6 md:px-8 py-6">
        {STAGES.map((stage) => {
          const stageBids = bids.filter((b) => b.stage === stage.key);
          return (
            <div key={stage.key} className="bg-surface/60 border border-border rounded-2xl flex flex-col max-h-[calc(100vh-260px)]">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
                </div>
                <span className="font-mono text-xs text-muted bg-surface2 rounded-full px-2 py-0.5">
                  {stageBids.length}
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.key);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const id = e.dataTransfer.getData('text/plain') || dragId;
                  if (id) onMoveStage(id, stage.key);
                }}
                className={
                  'p-2.5 overflow-y-auto flex-1 flex flex-col gap-2.5 min-h-[120px] rounded-b-2xl transition-colors ' +
                  (dragOverStage === stage.key ? 'bg-accent/5' : '')
                }
              >
                {stageBids.length === 0 ? (
                  <div className="text-xs text-muted text-center py-6 border border-dashed border-border rounded-xl">
                    {stage.key === 'lead' ? 'No leads here yet — log your first lead.' : 'Nothing in this stage yet.'}
                  </div>
                ) : (
                  stageBids.map((bid) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      commission={commissionFor(bid)}
                      onOpen={onOpenBid}
                      onDragStart={setDragId}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
