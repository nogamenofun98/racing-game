import React, { forwardRef } from 'react'
import Racer from './Racer'

const RaceTrack = forwardRef(({ racers, trackLength, onRegisterRacerRef }, ref) => {
    return (
        <div className="track-container">
            <div
                ref={ref}
                className="track-scroll-container"
            >
                <div className="track" style={{ width: `${trackLength + 1000}px` }}>
                    <div className="finish-line" style={{ left: `${trackLength}px`, right: 'auto' }}></div>
                    {racers.map((racer, index) => (
                        <div key={racer.id} className="lane" style={{ zIndex: racers.length - index }}>
                            <Racer
                                racer={racer}
                                ref={(el) => onRegisterRacerRef(racer.id, el)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})

export default RaceTrack
