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
      className="max-w-64 relative group group-hover:border-foreground flex no-underline border hover:border-muted-foreground transition-all">
      {/* top mask */}
      <div className="absolute w-full h-[100px] bg-gradient-to-b from-background to-background/0 -z-[9]" />

      {/* bottom mask */}
      <div className="absolute w-full bottom-0 h-[200px] bg-gradient-to-t from-background to-background/0 -z-[9]" />

      {/* cross */}
      <div className="absolute top-0 left-0 -translate-y-[17px] -translate-x-[1px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-y-[1px] translate-x-[16px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>

      {/* the grid */}
      <div className="absolute w-64 h-full flex flex-wrap flex-row -z-[10]">
        {Array.from({ length: 80 }).map((_, idx) => (
          <div
            key={idx}
            className="border-[0.5px] border-[#3c3c3c]/20 h-[32px] w-[32px]"
          />
        ))}
      </div>

      {/* the screen */}
      <div className="absolute top-[128px] left-[9px] -z-[10]">
        {/* the body */}
        <div className="flex flex-col relative w-[240px] h-[147px] border bg-white dark:bg-black rounded-t-sm">
          {/* status bar */}
          <div className="flex px-1 w-full relative items-center top-0 h-[14px] bg-[#3c3c3c]/10 dark:bg-[#3c3c3c]/50">
            <div className="flex flex-row gap-1 left-[4px]">
              <div className="h-[4px] w-[4px] rounded-full bg-[#FF2D55] dark:bg-[#FF2D55]/50" />
              <div className="h-[4px] w-[4px] rounded-full bg-[#FFCC00] dark:bg-[#FFCC00]/50" />
              <div className="h-[4px] w-[4px] rounded-full bg-[#00FF5F] dark:bg-[#00FF5F]/50" />
            </div>
          </div>

          {/* layout */}
          <div className="flex px-1 mt-1 gap-1 w-full -z-[0]">
            {/* left */}
            <div className="flex flex-col gap-1 px-1 py-1 bg-[#3c3c3c]/10 dark:bg-[#3c3c3c]/30 w-1/3 h-[130px] rounded-sm">
              <div className="w-1/4 h-[3px] bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="w-1/2 h-[3px] bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="w-1/3 h-[3px] bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
              <div className="w-3/4 h-[3px] bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]" />
            </div>

            {/* right */}
            <div className="flex flex-col gap-1 px-1 py-1 bg-[#3c3c3c]/10 dark:bg-[#3c3c3c]/30 w-full h-[130px] rounded-sm">
              <div className="w-1/5 h-[3px] bg-[#3c3c3c]/20 dark:bg-[#3c3c3c]/50" />
              <div className="w-1/2 h-[8px] bg-[#3c3c3c]/30 dark:bg-[#3c3c3c]" />
              <div className="w-full h-[60px] bg-[#3c3c3c]/20 darl:bg-[#3c3c3c]/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-64 w-64 h-80 px-4 py-4">
        <p className="text-foreground text-xl">{title}</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </a>
  )
}
