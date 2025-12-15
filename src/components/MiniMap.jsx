import React, { memo } from 'react'
import { getHueForIndex } from '../constants/racers'

const MiniMap = memo(({ racers, trackLength, onRegisterDotRef }) => {
    const getRacerColor = (racer) => {
        const index = racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)
        const hue = getHueForIndex(index)
        return `hsl(${hue}, 100%, 50%)`
    }

    // Initial render positions
    const getPct = (pos) => Math.min(100, Math.max(0, (pos / trackLength) * 100))

    return (
        <div className="mini-map-container">
            {racers.map(racer => {
                const pct = getPct(racer.position || 0)
                return (
                    <div key={racer.id} className="mini-map-row">
                        <div className="mini-map-track">
                            <div
                                ref={(el) => onRegisterDotRef && onRegisterDotRef(racer.id, el)}
                                className="mini-map-dot"
                                style={{
                                    left: `${pct}%`,
                                    backgroundColor: getRacerColor(racer),
                                }}
                                title={`${racer.name}`}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
})

export default MiniMap
