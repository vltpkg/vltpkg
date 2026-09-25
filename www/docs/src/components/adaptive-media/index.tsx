'use client'

import type { ReactNode } from 'react'
import type { MotionProps, Transition } from 'motion/react'
import {
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  motion,
  AnimatePresence,
} from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { cn } from 'cn'
import { TextEffect } from './text-effect'

const transition = {
  type: 'spring',
  stiffness: 350,
  damping: 35,
} satisfies Transition

// by default motion crossfades the two halves of a `layoutId` pair. two copies
// of the *same* media fading past each other don't composite back to opaque —
// coverage dips to ~75% at the midpoint — so the backdrop shows through the
// image mid-flight and the swap reads as a flicker. with the crossfade off,
// motion hides one half outright and a single opaque element does the morph.
// `layoutCrossfade` is a real prop (read in `useVisualElement`, kept off the DOM
// by motion's `layout*` prefix filter) that's missing from the published types.
const noCrossfade = { layoutCrossfade: false } as MotionProps

// compensating for the scrollbar keeps locking/unlocking from shifting the page
// horizontally, which would otherwise drag the thumbnail out from under the
// layout snapshot motion takes when the lightbox opens.
const lockScroll = () => {
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0)
    document.body.style.paddingRight = `${scrollbarWidth}px`
}

const unlockScroll = () => {
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
}

interface AdaptiveMediaProps {
  className?: string
  /** description shown under the media once it's open. blank means no caption */
  caption?: string
  /** rendered as the thumbnail and again inside the lightbox */
  renderMedia: (slot: MediaSlot) => ReactNode
  /** awaited between the click and the lightbox mounting */
  onBeforeOpen?: () => Promise<void>
  /** runs before the lightbox starts leaving — must be referentially stable */
  onClose?: () => void
}

/**
 * Everything the two halves of the shared transition have in common. Spread it
 * onto whichever element the caller renders — both halves must carry the same
 * `layoutId` for motion to morph between them.
 */
interface MediaSlot {
  role: 'thumbnail' | 'lightbox'
  layoutId: string
  className: string
  onClick: () => void
  transition: Transition
  /** drag-resize scale, thumbnail only */
  style?: MotionProps['style']
}

const lightboxMediaClassName =
  'relative w-auto max-w-7xl cursor-se-resize object-contain'

// the media and its caption stack and centre as one group, so the media's
// ceiling has to come down by the caption's share of the height. a fixed budget
// rather than flex shrinking, because a shrunk `object-contain` element keeps
// its box and letterboxes the content inside it — and a box that no longer hugs
// what you can see is a box the shared transition morphs to the wrong place.
const captionHeightBudget = 'max-h-[calc(100%-3.5rem)]'

/**
 * The shell both `AdaptiveImage` and `AdaptiveVideo` are built from: a resizable
 * thumbnail that morphs into a fullscreen lightbox via a shared `layoutId`.
 */
const AdaptiveMedia = ({
  className,
  caption,
  renderMedia,
  onBeforeOpen,
  onClose,
}: AdaptiveMediaProps) => {
  const [isGrabbed, setIsGrabbed] = useState<boolean>(false)
  const [selected, setSelected] = useState<boolean>(false)
  // `selected` flips back to false the instant we start closing, but the shared
  // transition keeps running until the lightbox has finished exiting. anything
  // that has to stay put for the whole open → close cycle keys off this instead.
  const [isMorphing, setIsMorphing] = useState<boolean>(false)
  const [, setRenderNudge] = useState<number>(0)
  // `onBeforeOpen` puts an await between the click and the open, so state isn't
  // a reliable guard against a second click landing in the gap
  const isOpening = useRef<boolean>(false)

  // scoped to this instance rather than the source url, so the same asset can
  // appear twice on a page without the two copies fighting over one layoutId.
  const layoutId = useId()

  const x = useMotionValue(0)

  const scale = useTransform(x, [-200, 0, 200], [0.75, 1, 1.5])
  const opacity = useTransform(x, [-200, 0, 200], [1, 0, 1])

  // true from the first drag pixel until the handle springs back to rest, so the
  // thumbnail stays above the (fullscreen) backdrop for the whole resize
  const [isResizing, setIsResizing] = useState<boolean>(false)
  useMotionValueEvent(x, 'change', v => setIsResizing(v !== 0))

  useEffect(() => {
    return () => unlockScroll()
  }, [])

  useEffect(() => {
    if (!selected) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose?.()
      setSelected(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, onClose])

  const handleOpen = async () => {
    if (selected || isOpening.current) return
    isOpening.current = true
    // gives the media a chance to make itself paintable before it mounts —
    // see `AdaptiveVideo`, where a brand-new <video> has no frame to show yet.
    if (onBeforeOpen) await onBeforeOpen()
    // motion's `layout`/`layoutId` tracking only re-measures an element on its
    // own re-renders, not on scroll — so after scrolling without the thumbnail
    // re-rendering, its cached box is stale. force a re-render here so motion
    // captures the thumbnail's true current position before the transition
    // starts on the next frame.
    window.scrollTo(window.scrollX, window.scrollY)
    lockScroll()
    setIsMorphing(true)
    setRenderNudge(n => n + 1)
    requestAnimationFrame(() => {
      setSelected(true)
      isOpening.current = false
    })
  }

  const handleClose = () => {
    if (!selected) return
    onClose?.()
    setSelected(false)
  }

  const handleMorphComplete = () => {
    setIsMorphing(false)
    unlockScroll()
  }

  return (
    <>
      {/* backdrop-blur */}
      <motion.div
        aria-hidden
        // fixed + just under the lightbox (z-1001) so the blur also covers the navbar and sidebar
        className="fixed inset-0 z-1000 backdrop-blur-lg select-none"
        transition={transition}
        style={{ opacity: opacity, pointerEvents: 'none' }}
      />

      {/* on close, motion promotes *this* thumbnail back to lead and morphs it
          from the lightbox's box down to its slot — so while the transition is
          in flight the thumbnail has to sit above the backdrop, or the whole
          return trip plays out behind a blur and reads as the media just fading
          out. `relative z-30` is a stacking context, so a z-index on the media
          alone can't escape it; the wrapper is what has to move. */}
      <div
        style={{ pointerEvents: isMorphing ? 'none' : undefined }}
        className={cn(
          'relative flex h-fit w-full items-center',
          isMorphing || isResizing ? 'z-1002' : 'z-30',
          className,
        )}>
        {renderMedia({
          role: 'thumbnail',
          layoutId,
          onClick: handleOpen,
          transition,
          style: { scale },
          className:
            'origin-center cursor-nwse-resize transition-colors duration-150',
        })}

        {/* resize-bar */}
        <motion.div
          style={{ x, scaleY: scale }}
          dragConstraints={{ left: 0, right: 0 }}
          drag="x"
          onDragStart={() => setIsGrabbed(true)}
          onDragEnd={() => setIsGrabbed(false)}
          className={cn(
            'absolute -right-6 hidden h-[60px] w-[4px] cursor-grab rounded-full md:flex',
            isGrabbed ?
              'bg-neutral-500 dark:bg-neutral-700'
            : 'bg-neutral-400 dark:bg-neutral-800',
            // rides along with the raised wrapper above, so it has to go away or
            // it draws on top of the backdrop while the lightbox is open
            isMorphing && 'invisible',
          )}
        />
      </div>

      {/* lightbox — deliberately a sibling of the wrapper above, not a child:
          the wrapper carries `md:-translate-x-1/2` from the caller, and a
          transformed ancestor becomes the containing block for `position: fixed`
          descendants, which would pin the modal to the article column instead of
          the viewport. */}
      <AnimatePresence onExitComplete={handleMorphComplete}>
        {selected && (
          <motion.div
            key="lightbox"
            className="not-prose fixed inset-0 z-1001 flex flex-col items-center justify-center gap-3 p-4 md:p-8">
            {/* lightbox backdrop. a fullscreen backdrop-filter has to be
                re-rasterized on every frame its opacity changes, so it gets a
                short tween rather than the spring's long settle — the blur is
                fully in before the morph lands, and the expensive part is over
                in a quarter second. */}
            <motion.div
              className="absolute inset-0 bg-white/30 backdrop-blur-lg dark:bg-black/30"
              onClick={handleClose}
              style={{ willChange: 'opacity' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />

            {renderMedia({
              role: 'lightbox',
              layoutId,
              onClick: handleClose,
              transition,
              className: cn(
                lightboxMediaClassName,
                caption ? captionHeightBudget : 'max-h-full',
              ),
            })}

            {/* `relative` to clear the absolutely positioned backdrop in the
                paint order, `pointer-events-none` so the click-anywhere-to-close
                target stays unbroken */}
            {caption && (
              <motion.div
                className="text-muted-foreground pointer-events-none relative max-w-2xl px-4 text-center text-sm text-pretty"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{
                  duration: 0.3,
                  ease: 'easeInOut',
                  delay: 0,
                }}>
                <TextEffect per="char">{caption}</TextEffect>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

interface AdaptiveImageProps {
  src: string
  alt?: string
  className?: string
}

const AdaptiveImage = ({
  alt,
  src,
  className,
}: AdaptiveImageProps): React.ReactElement => (
  <AdaptiveMedia
    className={className}
    caption={alt}
    renderMedia={({ role, className: mediaClassName, ...slot }) => (
      <motion.img
        {...noCrossfade}
        {...slot}
        alt={alt || 'image'}
        src={src}
        className={cn(
          mediaClassName,
          role === 'thumbnail' && 'border-border border',
        )}
      />
    )}
  />
)

interface AdaptiveVideoProps {
  src?: string
  /** description of the clip — there's no `alt` on a video, so it's the label */
  alt?: string
  poster?: string
  className?: string
  /** `<source>` elements, for callers that need more than one format */
  children?: ReactNode
}

const AdaptiveVideo = ({
  src,
  alt,
  poster,
  className,
  children,
}: AdaptiveVideoProps): React.ReactElement => {
  const thumbnail = useRef<HTMLVideoElement | null>(null)
  const lightbox = useRef<HTMLVideoElement | null>(null)
  // a `<video>` with no metadata yet lays out at the default 300×150, so the
  // lightbox copy would morph toward the wrong box and snap once it loads.
  // seeding it with the thumbnail's intrinsic size — already known by the time
  // anything is clickable — makes its box correct on the very first frame.
  const [intrinsic, setIntrinsic] = useState<{
    width: number
    height: number
  } | null>(null)
  // the thumbnail's frame at the moment of the click, handed to the lightbox
  // copy as its poster — see `captureCurrentFrame`.
  const [posterFrame, setPosterFrame] = useState<string | null>(null)

  const readIntrinsicSize = () => {
    const video = thumbnail.current
    if (!video?.videoWidth || !video.videoHeight) return
    setIntrinsic({
      width: video.videoWidth,
      height: video.videoHeight,
    })
  }

  // a cached video can reach `loadedmetadata` before hydration attaches the
  // handler below, so take a reading on mount too.
  useEffect(readIntrinsicSize, [])

  // an <img> repaints from cache the instant it mounts; a <video> doesn't. the
  // lightbox copy is a brand-new element with no decoded frame, so for the first
  // few frames of the morph it has nothing to paint — that's the flash. so grab
  // the frame the thumbnail is showing, decode it up front, and hand it over as
  // the lightbox's poster: the browser paints that until the video itself is
  // ready, and since we also start playback from the same timestamp, the
  // handover is invisible.
  const captureCurrentFrame = useCallback(async () => {
    const video = thumbnail.current
    if (!video?.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = canvas.toDataURL('image/jpeg', 0.85)
      // decoding here rather than letting the poster load lazily is the whole
      // point — an undecoded poster flashes exactly like the video does
      const image = new Image()
      image.src = frame
      await image.decode()
      setPosterFrame(frame)
    } catch {
      // cross-origin video taints the canvas — no poster, same as before
    }
  }, [])

  // the two halves of the transition are two separate <video> elements, so the
  // one taking over has to be seeked to where the other left off — otherwise
  // the morph lands on frame 0.
  const handoffToThumbnail = useCallback(() => {
    if (!lightbox.current || !thumbnail.current) return
    thumbnail.current.currentTime = lightbox.current.currentTime
  }, [])

  return (
    <AdaptiveMedia
      className={className}
      caption={alt}
      onBeforeOpen={captureCurrentFrame}
      onClose={handoffToThumbnail}
      renderMedia={({ role, className: mediaClassName, ...slot }) => {
        const isThumbnail = role === 'thumbnail'
        return (
          <motion.video
            {...noCrossfade}
            {...slot}
            src={src}
            aria-label={alt || undefined}
            poster={isThumbnail ? poster : (posterFrame ?? poster)}
            ref={
              isThumbnail ? thumbnail : (
                (node: HTMLVideoElement | null) => {
                  lightbox.current = node
                  // set before the element has metadata, so this becomes its
                  // default playback start position rather than a seek — a
                  // seek would blank the element all over again
                  if (node && thumbnail.current)
                    node.currentTime = thumbnail.current.currentTime
                }
              )
            }
            width={isThumbnail ? undefined : intrinsic?.width}
            height={isThumbnail ? undefined : intrinsic?.height}
            onLoadedMetadata={
              isThumbnail ? readIntrinsicSize : undefined
            }
            className={cn(
              mediaClassName,
              isThumbnail && 'border-border w-full rounded-sm border',
            )}
            autoPlay
            muted
            loop
            playsInline
            preload="auto">
            {children}
          </motion.video>
        )
      }}
    />
  )
}

export { AdaptiveImage, AdaptiveVideo }
