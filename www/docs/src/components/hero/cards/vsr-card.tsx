export const VSRCard = ({
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
      className="group relative flex max-w-64 border no-underline transition-all hover:border-muted-foreground group-hover:border-foreground">
      {/* top mask */}
      <div className="absolute -z-[9] h-[100px] w-full bg-gradient-to-b from-background to-background/0" />

      {/* bottom mask */}
      <div className="absolute bottom-0 -z-[9] h-[200px] w-full bg-gradient-to-t from-background to-background/0" />

      {/* cross */}
      <div className="absolute left-0 top-0 -translate-x-[1px] -translate-y-[17px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-x-[16px] translate-y-[1px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>

      {/* the grid */}
      <div className="absolute -z-[10] flex h-full w-64 flex-row flex-wrap">
        {Array.from({ length: 80 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[32px] w-[32px] border-[0.5px] border-[#3c3c3c]/20"
          />
        ))}
      </div>

      {/* the screen */}
      <div className="absolute left-[9px] top-[128px] -z-[10]">
        {/* the body */}
        <div className="relative flex h-[147px] w-[240px] flex-col rounded-t-sm border bg-white dark:bg-black">
          {/* status bar */}
          <div className="relative top-0 flex h-[14px] w-full items-center bg-[#3c3c3c]/10 px-1 dark:bg-[#3c3c3c]/50">
            <div className="left-[4px] flex flex-row gap-1">
              <div className="h-[4px] w-[4px] rounded-full bg-[#FF2D55] dark:bg-[#FF2D55]/50" />
              <div className="h-[4px] w-[4px] rounded-full bg-[#FFCC00] dark:bg-[#FFCC00]/50" />
              <div className="h-[4px] w-[4px] rounded-full bg-[#00FF5F] dark:bg-[#00FF5F]/50" />
            </div>
          </div>

          {/* layout */}
          <div className="-z-[0] mt-1 flex w-full gap-1 px-1">
            {/* left */}
            <div className="flex h-[130px] w-1/3 flex-col gap-1 rounded-sm bg-[#3c3c3c]/10 px-1 py-1 dark:bg-[#3c3c3c]/30">
              <div className="h-[3px] w-1/4 bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="h-[3px] w-1/2 bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="h-[3px] w-1/3 bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="h-[3px] w-3/4 bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
            </div>

            {/* right */}
            <div className="flex h-[130px] w-full flex-col gap-1 rounded-sm bg-[#3c3c3c]/10 px-1 py-1 dark:bg-[#3c3c3c]/30">
              <div className="h-[3px] w-1/5 bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]/50" />
              <div className="h-[8px] w-1/2 bg-[#3c3c3c]/30 dark:bg-[#3c3c3c]" />
              <div className="darl:bg-[#3c3c3c]/60 h-[60px] w-full bg-[#3c3c3c]/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="h-80 w-64 max-w-64 px-4 py-4">
        <p className="text-xl text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </a>
  )
}
