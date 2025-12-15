import React, { forwardRef, useMemo, memo } from 'react'
import RunnerSprite from './RunnerSprite'
import { getHueForIndex } from '../constants/racers'

const Racer = memo(forwardRef(({ racer }, ref) => {
    // Randomize colors for variety (Original is Red)
    const hue = useMemo(() => {
        const index = racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)
        return getHueForIndex(index)
    }, [racer.colorIndex, racer.id])

    const isMobilePortrait = typeof window !== 'undefined' &&
        window.innerWidth <= 768 &&
        window.innerHeight >= window.innerWidth

    const baseTransform = `translateX(${racer.position || 0}px)`
    const transform = isMobilePortrait
        ? `${baseTransform} translateY(-24px) scale(0.7)`
        : baseTransform

    const spriteSize = isMobilePortrait ? 140 : 225
    const nameStyle = isMobilePortrait ? { fontSize: '12px', marginBottom: '-40px' } : undefined

    return (
        <div
            ref={ref}
            className="racer-container"
            style={{
                transform,
                bottom: isMobilePortrait ? '-12px' : undefined
            }}
        >
            <div className="racer-name" style={nameStyle}>{racer.name}</div>
            <RunnerSprite hue={hue} size={spriteSize} />
        </div>
    )
}))

export default Racer
