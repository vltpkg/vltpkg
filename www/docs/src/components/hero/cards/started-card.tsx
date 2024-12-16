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

      {/* the layout */}
      <div className="absolute top-[127.5px] left-[8px]">
        {/* the body */}
        <div className="relative flex flex-col bg-white border border-muted-foreground/30 rounded-sm dark:bg-black h-[160px] w-[240px] -z-[10]">
          {/* status bar */}
          <div className="flex flex-row px-1 gap-1 items-center w-full h-[14px] bg-muted-foreground/10 dark:bg-muted-foreground/20">
            <div className="h-[4px] w-[4px] rounded-full bg-[#FF2D55] dark:bg-[#FF2D55]/50" />
            <div className="h-[4px] w-[4px] rounded-full bg-[#FFCC00] dark:bg-[#FFCC00]/50" />
            <div className="h-[4px] w-[4px] rounded-full bg-[#00FF5F] dark:bg-[#00FF5F]/50" />
          </div>

          <div className="text-muted-foreground px-2 py-2">
            {/* welcome msg */}
            <p className="font-mono text-xs text-muted-foreground/50">
              # welcome to vlt
            </p>

            {/* cursor */}
            <p className="flex gap-1 font-mono text-xs">
              <span>⚡︎</span>
              <span>~</span>
              <span className="animate-blink bg-[#c7359c] select-none h-[2.25ch] w-[1ch] rounded-[1px]">
                &nbsp;
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="w-64 h-80 px-4 py-4">
        <p className="text-foreground text-xl">{title}</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </a>
  )
}
