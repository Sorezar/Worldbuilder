import React from 'react'
import GraphCore from '../components/GraphCore.jsx'

export default function GraphView({ cards, customTypes, onOpenCard, worldId }) {
  return (
    <GraphCore
      cards={cards}
      customTypes={customTypes}
      onOpenCard={onOpenCard}
      storageKey={worldId ? `wf_${worldId}_graph` : null}
    />
  )
}
