export const WorkspacesCard = ({
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

      {/* crosses */}
      <div className="absolute left-0 top-0 -translate-x-[1px] -translate-y-[17px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-x-[16px] translate-y-[1px]">
        <div className="h-[16px] w-[1px] translate-y-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
        <div className="h-[1px] w-[16px] -translate-x-[8px] bg-muted-foreground/50 transition-colors group-hover:bg-muted-foreground dark:bg-[#3c3c3c]" />
      </div>

      {/* layout */}
      <div className="absolute left-[96px] top-[160px] -z-[10]">
        {/* main pkg */}
        <div className="relative h-[64px] w-[64px] border border-muted-foreground/30 bg-muted-foreground/30" />

        {/* small pkgs */}
        <div className="relative right-[64px] h-[32px] w-[32px] border border-muted-foreground/20 bg-muted-foreground/20 group-hover:animate-pulse" />
        <div className="relative left-[64px] h-[32px] w-[32px] border border-muted-foreground/20 bg-muted-foreground/20 group-hover:animate-pulse" />
        <div className="relative -top-[192px] h-[32px] w-[32px] border border-muted-foreground/20 bg-muted-foreground/20 group-hover:animate-pulse" />
        <div className="relative -top-[192px] right-[64px] h-[32px] w-[32px] border border-muted-foreground/20 bg-muted-foreground/20 group-hover:animate-pulse" />
        <div className="relative -top-[192px] left-[96px] h-[32px] w-[32px] border border-muted-foreground/20 bg-muted-foreground/20 group-hover:animate-pulse" />
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

      <div className="h-80 w-64 px-4 py-4">
        <p className="text-xl text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </a>
  )
}
