import React, { forwardRef, useMemo, memo } from 'react'
import RunnerSprite from './RunnerSprite'

const Racer = memo(forwardRef(({ racer }, ref) => {
    // We rely on props for INITIAL position/render, but updates happen via ref
    // console.log(`Racer ${racer.name} rendering`)

    // Randomize colors for variety (Original is Red)
    const hue = useMemo(() => {
        // Distribute hues across the spectrum
        const hues = [0, 120, 240, 60, 300, 180, 30, 270]
        // Use colorIndex if available, otherwise fallback to ID hash or 0
        const index = racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)
        return hues[index % hues.length]
    }, [racer.colorIndex, racer.id])

    return (
        <div
            ref={ref}
            className="racer-container"
            style={{ transform: `translateX(${racer.position || 0}px)` }}
        >
            <div className="racer-name">{racer.name}</div>
            <RunnerSprite hue={hue} />
        </div>
    )
}))

export default Racer
