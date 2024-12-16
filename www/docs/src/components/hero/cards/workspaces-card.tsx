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
      className="max-w-64 relative group group-hover:border-foreground flex no-underline border hover:border-muted-foreground transition-all">
      {/* top mask */}
      <div className="absolute w-full h-[100px] bg-gradient-to-b from-background to-background/0 -z-[9]" />

      {/* bottom mask */}
      <div className="absolute w-full bottom-0 h-[200px] bg-gradient-to-t from-background to-background/0 -z-[9]" />

      {/* crosses */}
      <div className="absolute top-0 left-0 -translate-y-[17px] -translate-x-[1px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-y-[1px] translate-x-[16px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>

      {/* layout */}
      <div className="absolute top-[160px] left-[96px] -z-[10]">
        {/* main pkg */}
        <div className="relative w-[64px] h-[64px] border bg-muted-foreground/30 border-muted-foreground/30" />

        {/* small pkgs */}
        <div className="relative group-hover:animate-pulse w-[32px] h-[32px] border border-muted-foreground/20 bg-muted-foreground/20 right-[64px]" />
        <div className="relative group-hover:animate-pulse w-[32px] h-[32px] border border-muted-foreground/20 bg-muted-foreground/20 left-[64px]" />
        <div className="relative group-hover:animate-pulse w-[32px] h-[32px] border border-muted-foreground/20 bg-muted-foreground/20 -top-[192px]" />
        <div className="relative group-hover:animate-pulse w-[32px] h-[32px] border border-muted-foreground/20 bg-muted-foreground/20 -top-[192px] right-[64px]" />
        <div className="relative group-hover:animate-pulse w-[32px] h-[32px] border border-muted-foreground/20 bg-muted-foreground/20 -top-[192px] left-[96px]" />
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

      <div className="w-64 h-80 px-4 py-4">
        <p className="text-foreground text-xl">{title}</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </a>
  )
}
