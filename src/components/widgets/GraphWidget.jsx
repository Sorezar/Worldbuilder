import GraphCore from '../GraphCore.jsx'

export default function GraphWidget({ widget, card, cards, customTypes, onOpenCard, onUpdateConfig }) {
  const showSettings = widget?.config?.showSettings || false
  return (
    <GraphCore
      cards={cards}
      customTypes={customTypes}
      onOpenCard={onOpenCard}
      storageKey={card ? `wf_graph_${card.id}` : null}
      compact
      externalShowSettings={showSettings}
      onToggleSettings={v => onUpdateConfig({ showSettings: typeof v === 'function' ? v(showSettings) : v })}
    />
  )
}
