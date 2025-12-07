import React, { forwardRef } from 'react'

const Timer = forwardRef((props, ref) => {
    return (
        <div className="timer" ref={ref}>
            00:00:00
        </div>
    )
})

export default Timer
