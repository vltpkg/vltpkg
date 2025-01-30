export const StartedCard = ({
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

      {/* the layout */}
      <div className="absolute left-[8px] top-[127.5px]">
        {/* the body */}
        <div className="relative -z-[10] flex h-[160px] w-[240px] flex-col rounded-sm border border-muted-foreground/30 bg-white dark:bg-black">
          {/* status bar */}
          <div className="flex h-[14px] w-full flex-row items-center gap-1 bg-muted-foreground/10 px-1 dark:bg-muted-foreground/20">
            <div className="h-[4px] w-[4px] rounded-full bg-[#FF2D55] dark:bg-[#FF2D55]/50" />
            <div className="h-[4px] w-[4px] rounded-full bg-[#FFCC00] dark:bg-[#FFCC00]/50" />
            <div className="h-[4px] w-[4px] rounded-full bg-[#00FF5F] dark:bg-[#00FF5F]/50" />
          </div>

          <div className="px-2 py-2 text-muted-foreground">
            {/* welcome msg */}
            <p className="font-mono text-xs text-muted-foreground/50">
              # welcome to vlt
            </p>

            {/* cursor */}
            <p className="flex gap-1 font-mono text-xs">
              <span>⚡︎</span>
              <span>~</span>
              <span className="h-[2.25ch] w-[1ch] animate-blink select-none rounded-[1px] bg-[#c7359c]">
                &nbsp;
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="h-80 w-64 px-4 py-4">
        <p className="text-xl text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </a>
  )
}
