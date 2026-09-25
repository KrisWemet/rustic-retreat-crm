import monogram from '@/assets/brand/rr-monogram.svg'

// The Rustic Retreat monogram, painted with currentColor through a CSS mask so
// it takes the text colour of its container. Size it with a height class; the
// aspect ratio supplies the width.
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        aspectRatio: '480 / 364',
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${monogram})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${monogram})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  )
}
