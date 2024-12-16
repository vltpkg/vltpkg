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
      className="max-w-64 relative flex no-underline border group hover:border-muted-foreground transition-all">
      {/* cross */}
      <div className="absolute top-0 left-0 -translate-y-[17px] -translate-x-[1px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>
      <div className="absolute bottom-0 right-0 translate-y-[1px] translate-x-[16px]">
        <div className="h-[16px] w-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors translate-y-[8px]" />
        <div className="w-[16px] h-[1px] bg-muted-foreground/50 dark:bg-[#3c3c3c] group-hover:bg-muted-foreground transition-colors -translate-x-[8px]" />
      </div>

      {/* top mask */}
      <div className="absolute w-full h-[150px] bg-gradient-to-b from-background to-background/0 -z-[9]" />
      {/* bottom mask */}
      <div className="absolute w-full bottom-0 h-[200px] bg-gradient-to-t from-background to-background/0 -z-[9]" />

      {/* grid wrapper */}
      <div className="absolute w-64 h-full flex flex-wrap flex-row -z-[10]">
        {/* blocks */}

        {/* block-1 */}
        <div className="absolute top-[224px] left-[0px] w-[32px] h-[32px] group-hover:translate-x-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[288px] left-[64px] w-[32px] h-[32px] group-hover:-translate-y-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[224px] left-[128px] w-[32px] h-[32px] group-hover:-translate-x-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[160px] left-[64px] w-[32px] h-[32px] group-hover:translate-y-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />

        {/* block-2 */}
        <div className="absolute top-[128px] left-[32px] w-[32px] h-[32px] group-hover:translate-x-[96px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[64px] left-[160px] w-[32px] h-[32px] group-hover:translate-y-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[128px] left-[224px] w-[32px] h-[32px] group-hover:-translate-x-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />
        <div className="absolute top-[192px] left-[160px] w-[32px] h-[32px] group-hover:-translate-y-[32px] bg-[#3C3C3C]/20 dark:bg-[#3C3C3C]/50 transition-transform" />

        {/* grid blocks background */}
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
