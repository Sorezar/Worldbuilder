import GraphCore from '../GraphCore.jsx'

export default function GraphWidget({ card, cards, customTypes, onOpenCard }) {
  return (
    <GraphCore
      cards={cards}
      customTypes={customTypes}
      onOpenCard={onOpenCard}
      storageKey={card ? `wf_graph_${card.id}` : null}
      compact
    />
  )
}
