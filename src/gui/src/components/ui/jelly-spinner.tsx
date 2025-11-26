import type React from 'react'

interface JellyTriangleSpinnerProps {
  size?: number
  speed?: number
  className?: string
}

export const JellyTriangleSpinner = ({
  size = 30,
  speed = 1.75,
  className = '',
}: JellyTriangleSpinnerProps) => {
  const filterId = `uib-jelly-triangle-ooze-${Math.random().toString(36).substring(2, 9)}`

  return (
    <>
      <div
        className={`relative ${className}`}
        style={
          {
            '--uib-size': `${size}px`,
            '--uib-color': 'var(--color-primary)',
            '--uib-speed': `${speed}s`,
            height: `${size}px`,
            width: `${size}px`,
            filter: `url('#${filterId}')`,
          } as React.CSSProperties
        }>
        <div className="jelly-dot" />
        <div className="jelly-traveler" />
      </div>

      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="3.333"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="ooze"
            />
            <feBlend in="SourceGraphic" in2="ooze" />
          </filter>
        </defs>
      </svg>

      <style>{`
        .jelly-dot,
        .jelly-traveler,
        div[style*='--uib-size']::before,
        div[style*='--uib-size']::after {
          content: '';
          position: absolute;
          width: 33%;
          height: 33%;
          background-color: var(--uib-color);
          border-radius: 100%;
          will-change: transform;
          transition: background-color 0.3s ease;
        }

        .jelly-dot {
          bottom: 6%;
          left: 30%;
          animation: jelly-grow var(--uib-speed) ease infinite;
        }

        div[style*='--uib-size']::before {
          top: 6%;
          right: 0;
          animation: jelly-grow var(--uib-speed) ease
            calc(var(--uib-speed) * -0.666) infinite;
        }

        div[style*='--uib-size']::after {
          top: 6%;
          left: 0;
          animation: jelly-grow var(--uib-speed) ease
            calc(var(--uib-speed) * -0.333) infinite;
        }

        .jelly-traveler {
          position: absolute;
          bottom: 6%;
          left: 30%;
          width: 33%;
          height: 33%;
          background-color: var(--uib-color);
          border-radius: 100%;
          animation: jelly-triangulate var(--uib-speed) ease infinite;
          transition: background-color 0.3s ease;
        }

        @keyframes jelly-triangulate {
          0%,
          100% {
            transform: none;
          }

          33.333% {
            transform: translate(-95%, -175%);
          }

          66.666% {
            transform: translate(120%, -175%);
          }
        }

        @keyframes jelly-grow {
          0%,
          85%,
          100% {
            transform: scale(1.5);
          }

          50%,
          60% {
            transform: scale(0);
          }
        }
      `}</style>
    </>
  )
}
