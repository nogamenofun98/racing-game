import React, { useMemo } from 'react'
import Lottie from 'lottie-react'
import animationData from '../assets/Loading 50 _ Among Us.json'

const RunnerSprite = ({ hue = 0 }) => {
    // Map hue (0-360) to approximate RGB for the suit
    // This is a simplification. Ideally we'd pass RGB directly from Racer.jsx
    // But to keep props consistent, we'll generate RGB from HSL here or just use a lookup

    const targetColor = useMemo(() => {
        // Simple HSL to RGB conversion or lookup based on hue
        // Let's use a helper to convert HSL(hue, 80%, 50%) to RGB [0-1]
        return hslToRgb(hue / 360, 0.8, 0.5)
    }, [hue])

    const modifiedAnimationData = useMemo(() => {
        // Deep clone the animation data
        const data = JSON.parse(JSON.stringify(animationData))

        // Recursive function to find and replace colors
        const replaceColor = (obj) => {
            if (typeof obj !== 'object' || obj === null) return

            // Check if this object looks like a color array [r, g, b, a]
            // The original red colors are approx:
            // [0.8, 0.09, 0.145, 1]
            // [0.929, 0.11, 0.141, 1]
            // [0.800000011921, 0.090000003576, 0.144999995828, 1]

            if (Array.isArray(obj) && obj.length === 4 && typeof obj[0] === 'number') {
                const r = obj[0]
                const g = obj[1]
                const b = obj[2]

                // Check if it's one of the red shades
                if ((r > 0.7 && r < 0.95) && (g < 0.2) && (b < 0.2)) {
                    obj[0] = targetColor[0]
                    obj[1] = targetColor[1]
                    obj[2] = targetColor[2]
                }
                // Also replace the "k" property in shapes which holds the color
            } else if (obj.k && Array.isArray(obj.k) && obj.k.length === 4 && typeof obj.k[0] === 'number') {
                const r = obj.k[0]
                const g = obj.k[1]
                const b = obj.k[2]
                if ((r > 0.7 && r < 0.95) && (g < 0.2) && (b < 0.2)) {
                    obj.k[0] = targetColor[0]
                    obj.k[1] = targetColor[1]
                    obj.k[2] = targetColor[2]
                }
            }

            // Recurse
            for (const key in obj) {
                replaceColor(obj[key])
            }
        }

        replaceColor(data)
        return data
    }, [targetColor])

    return (
        <div className="runner-wrapper">
            <Lottie
                animationData={modifiedAnimationData}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
            />
            <style>{`
        .runner-wrapper {
          width: 225px;
          height: 225px;
          overflow: visible; 
        }
      `}</style>
        </div>
    )
}

// Helper: HSL to RGB [0-1]
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
}

export default RunnerSprite
