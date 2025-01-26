export const ConfigCard = ({
  title,
  subtitle,
  link,
}: {
  title: string
  subtitle: string
  link: string
}) => {
  return (
    <a
      href={link}
      className="group relative flex max-w-64 border no-underline transition-all hover:border-muted-foreground">
      {/* cross */}
      <div className="absolute left-0 top-0 -translate-x-[1px] -translate-y-[17px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-x-[16px] translate-y-[1px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>

      {/* top mask */}
      <div className="absolute -z-[9] h-[150px] w-full bg-gradient-to-b from-background to-background/0" />
      {/* bottom mask */}
      <div className="absolute bottom-0 -z-[9] h-[200px] w-full bg-gradient-to-t from-background to-background/0" />

      {/* grid wrapper */}
      <div className="absolute -z-[10] flex h-full w-64 flex-row flex-wrap">
        {/* blocks */}

        {/* block-1 */}
        <div className="absolute left-[0px] top-[224px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:translate-x-[32px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[64px] top-[288px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:-translate-y-[32px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[128px] top-[224px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:-translate-x-[32px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[64px] top-[160px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:translate-y-[32px] dark:bg-[#3C3C3C]/50" />

        {/* block-2 */}
        <div className="absolute left-[32px] top-[128px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:translate-x-[96px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[160px] top-[64px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:translate-y-[32px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[224px] top-[128px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:-translate-x-[32px] dark:bg-[#3C3C3C]/50" />
        <div className="absolute left-[160px] top-[192px] h-[32px] w-[32px] bg-[#3C3C3C]/20 transition-transform group-hover:-translate-y-[32px] dark:bg-[#3C3C3C]/50" />

        {/* grid blocks background */}
        {Array.from({ length: 80 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[32px] w-[32px] border-[0.5px] border-[#3c3c3c]/20"
          />
        ))}
      </div>

      <div className="h-80 w-64 px-4 py-4">
        <p className="text-xl text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </a>
  )
}
